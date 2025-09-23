<?php

namespace App\Jobs;

use App\Models\ParkingSlot;
use App\Models\ParkingSession;
use App\Services\CacheService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessQRScan implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $qrData,
        public string $userId,
        public array $location,
        public string $scanTimestamp
    ) {
        $this->onQueue('parking-operations');
    }

    public function handle(CacheService $cacheService): void
    {
        Log::info('Processing QR scan', [
            'user_id' => $this->userId,
            'qr_data' => substr($this->qrData, 0, 20) . '...',
            'location' => $this->location
        ]);

        try {
            // Parse QR data to extract parking slot ID
            $slotId = $this->parseQRData($this->qrData);

            if (!$slotId) {
                Log::warning('Invalid QR data format', ['qr_data' => $this->qrData]);
                return;
            }

            // Get parking slot
            $slot = ParkingSlot::find($slotId);
            if (!$slot) {
                Log::warning('Parking slot not found', ['slot_id' => $slotId]);
                return;
            }

            // Validate slot is available
            if ($slot->status !== 'available') {
                Log::warning('Parking slot not available', [
                    'slot_id' => $slotId,
                    'status' => $slot->status
                ]);
                return;
            }

            // Create scan session (temporary hold on the slot)
            $sessionToken = $this->generateSessionToken();
            $expiresAt = now()->addMinutes(5); // 5-minute window to complete booking

            // Store scan result in cache for quick retrieval
            $scanResult = [
                'scan_id' => uniqid('scan_'),
                'session_token' => $sessionToken,
                'slot_info' => [
                    'id' => $slot->id,
                    'slot_number' => $slot->slot_number,
                    'hourly_rate' => $slot->base_hourly_rate,
                    'status' => $slot->status,
                ],
                'expires_at' => $expiresAt->toISOString(),
                'location' => $this->location,
                'user_id' => $this->userId,
            ];

            // Cache the scan result
            $cacheService->cacheWithTags(
                ['qr_scans', 'user:' . $this->userId],
                'qr_scan:' . $scanResult['scan_id'],
                $scanResult,
                300 // 5 minutes TTL
            );

            // Temporarily reserve the slot
            $slot->update(['status' => 'reserved']);
            $cacheService->invalidateParkingSlot($slot->id);

            // Schedule job to release reservation if not confirmed
            UpdateSlotAvailability::dispatch($slot->id, 'available')
                ->delay($expiresAt);

            Log::info('QR scan processed successfully', [
                'scan_id' => $scanResult['scan_id'],
                'slot_id' => $slot->id,
                'expires_at' => $expiresAt
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to process QR scan', [
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->fail($e);
        }
    }

    private function parseQRData(string $qrData): ?string
    {
        // Handle different QR code formats
        if (str_starts_with($qrData, 'parking://slot/')) {
            return str_replace('parking://slot/', '', $qrData);
        }

        if (str_starts_with($qrData, '{')) {
            $decoded = json_decode($qrData, true);
            return $decoded['slot_id'] ?? null;
        }

        // Assume it's a direct slot UUID
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $qrData)) {
            return $qrData;
        }

        return null;
    }

    private function generateSessionToken(): string
    {
        return 'session_' . uniqid() . '_' . random_int(1000, 9999);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('QR scan job failed', [
            'user_id' => $this->userId,
            'exception' => $exception->getMessage()
        ]);
    }
}
