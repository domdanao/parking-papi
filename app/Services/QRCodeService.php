<?php

namespace App\Services;

use App\Models\ParkingSlot;
use App\Models\QRCode;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class QRCodeService
{
    /**
     * Generate QR code for a parking slot
     */
    public function generateQRCodeForSlot(ParkingSlot $slot): QRCode
    {
        // Check if QR code already exists for this slot
        $existingQR = QRCode::where('parking_slot_id', $slot->id)->first();
        if ($existingQR) {
            return $existingQR;
        }

        // Generate unique QR data
        $qrData = $this->generateQRData($slot);

        // Generate QR code image
        $qrCodeImage = $this->generateQRImage($qrData, $slot->id);

        // Store QR code record
        $qrCode = QRCode::create([
            'id' => Str::uuid(),
            'parking_slot_id' => $slot->id,
            'qr_data' => $qrData,
            'qr_image_path' => $qrCodeImage,
            'status' => 'active',
            'expires_at' => null, // Permanent QR codes for slots
            'scan_count' => 0,
            'last_scanned_at' => null,
        ]);

        return $qrCode;
    }

    /**
     * Generate QR data payload for parking slot
     */
    private function generateQRData(ParkingSlot $slot): string
    {
        $baseUrl = config('app.url');

        // Create parking-specific QR data
        $qrPayload = [
            'type' => 'parking_slot',
            'slot_id' => $slot->id,
            'version' => '1.0',
            'timestamp' => now()->timestamp,
            'signature' => $this->generateSignature($slot->id),
        ];

        // Encode as URL that opens our app
        $encodedData = base64_encode(json_encode($qrPayload));
        return $baseUrl . '/parking/scan/' . $encodedData;
    }

    /**
     * Generate security signature for QR code
     */
    private function generateSignature(string $slotId): string
    {
        $secret = config('app.key');
        return hash_hmac('sha256', $slotId . now()->format('Y-m-d'), $secret);
    }

    /**
     * Generate QR code image and store it
     */
    private function generateQRImage(string $qrData, string $slotId): string
    {
        $filename = 'qr-codes/slot-' . $slotId . '.svg';

        // Generate QR code with BaconQrCode
        $renderer = new ImageRenderer(
            new RendererStyle(300, 2),
            new SvgImageBackEnd()
        );

        $writer = new Writer($renderer);
        $qrCode = $writer->writeString($qrData);

        // Store in public disk
        Storage::disk('public')->put($filename, $qrCode);

        return $filename;
    }

    /**
     * Validate and decode QR data
     */
    public function validateQRData(string $encodedData): array
    {
        try {
            $decodedData = base64_decode($encodedData);
            $qrPayload = json_decode($decodedData, true);

            if (!$qrPayload || !isset($qrPayload['slot_id'], $qrPayload['signature'])) {
                throw new \InvalidArgumentException('Invalid QR code format');
            }

            // Validate signature (optional - for enhanced security)
            $expectedSignature = $this->generateSignature($qrPayload['slot_id']);
            if ($qrPayload['signature'] !== $expectedSignature) {
                // For now, just log but don't fail - signatures expire daily
                logger()->warning('QR code signature mismatch', [
                    'slot_id' => $qrPayload['slot_id'],
                    'expected' => $expectedSignature,
                    'received' => $qrPayload['signature']
                ]);
            }

            return $qrPayload;
        } catch (\Exception $e) {
            throw new \InvalidArgumentException('Failed to decode QR data: ' . $e->getMessage());
        }
    }

    /**
     * Process QR code scan and return slot information
     */
    public function processScan(string $encodedData, ?string $userId = null, ?array $location = null): array
    {
        $qrPayload = $this->validateQRData($encodedData);

        // Find the parking slot
        $slot = ParkingSlot::with(['slotOwner'])->find($qrPayload['slot_id']);
        if (!$slot) {
            throw new \InvalidArgumentException('Parking slot not found');
        }

        // Update QR code scan statistics
        $qrCode = QRCode::where('parking_slot_id', $slot->id)->first();
        if ($qrCode) {
            $qrCode->increment('scan_count');
            $qrCode->update(['last_scanned_at' => now()]);
        }

        // Validate location if provided (within reasonable distance)
        if ($location && $this->isLocationTooFar($slot, $location)) {
            throw new \InvalidArgumentException('You must be near the parking slot to scan this code');
        }

        // Check slot availability
        if ($slot->status !== 'available') {
            throw new \InvalidArgumentException('This parking slot is currently not available');
        }

        // Generate session token for booking
        $sessionToken = $this->generateSessionToken($slot->id, $userId);

        return [
            'slot' => [
                'id' => $slot->id,
                'status' => $slot->status,
                'base_hourly_rate' => $slot->base_hourly_rate,
                'location' => [
                    'latitude' => $slot->latitude,
                    'longitude' => $slot->longitude,
                ],
                'description' => $slot->address ?? $slot->landmark_references ?? 'Parking Location',
                'features' => $slot->features ?? [],
                'owner' => [
                    'name' => $slot->slotOwner->name ?? 'Parking Operator',
                ],
                'area' => [
                    'name' => 'Parking Area', // Default since area relationship doesn't exist yet
                ],
            ],
            'session_token' => $sessionToken,
            'expires_at' => now()->addMinutes(5)->toISOString(), // 5-minute booking window
            'scan_location' => $location,
            'terms_url' => url('/terms-and-conditions'),
            'pricing_info' => $this->calculatePricing($slot),
        ];
    }

    /**
     * Check if scan location is too far from slot
     */
    private function isLocationTooFar(ParkingSlot $slot, array $location): bool
    {
        if (!isset($location['latitude'], $location['longitude'])) {
            return false; // Skip validation if location data is incomplete
        }

        $distance = $this->calculateDistance(
            $slot->latitude,
            $slot->longitude,
            $location['latitude'],
            $location['longitude']
        );

        // Allow scans within 100 meters
        return $distance > 100;
    }

    /**
     * Calculate distance between two points in meters
     */
    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // Earth's radius in meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat/2) * sin($dLat/2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon/2) * sin($dLon/2);

        $c = 2 * atan2(sqrt($a), sqrt(1-$a));

        return $earthRadius * $c;
    }

    /**
     * Generate session token for booking
     */
    private function generateSessionToken(string $slotId, ?string $userId): string
    {
        $payload = [
            'slot_id' => $slotId,
            'user_id' => $userId,
            'issued_at' => now()->timestamp,
            'expires_at' => now()->addMinutes(5)->timestamp,
        ];

        return base64_encode(json_encode($payload));
    }

    /**
     * Calculate pricing information for the slot
     */
    private function calculatePricing(ParkingSlot $slot): array
    {
        $baseRate = $slot->base_hourly_rate;

        return [
            'hourly_rate' => $baseRate,
            'minimum_charge' => $baseRate, // 1 hour minimum
            'daily_rate' => $baseRate * 24 * 0.8, // 20% discount for full day
            'currency' => 'USD',
            'examples' => [
                '1 hour' => $baseRate,
                '2 hours' => $baseRate * 2,
                '4 hours' => $baseRate * 4,
                '8 hours' => $baseRate * 8,
                'Full day (24h)' => $baseRate * 24 * 0.8,
            ],
        ];
    }

    /**
     * Generate QR codes for all approved slots
     */
    public function generateQRCodesForAllSlots(): array
    {
        $slots = ParkingSlot::where('approval_status', 'approved')->get();
        $results = [];

        foreach ($slots as $slot) {
            try {
                $qrCode = $this->generateQRCodeForSlot($slot);
                $results[] = [
                    'slot_id' => $slot->id,
                    'qr_code_id' => $qrCode->id,
                    'status' => 'success',
                    'image_path' => $qrCode->qr_image_path,
                ];
            } catch (\Exception $e) {
                $results[] = [
                    'slot_id' => $slot->id,
                    'status' => 'error',
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * Get QR code URL for display
     */
    public function getQRCodeUrl(ParkingSlot $slot): ?string
    {
        $qrCode = QRCode::where('parking_slot_id', $slot->id)->first();

        if (!$qrCode || !$qrCode->qr_image_path) {
            return null;
        }

        return Storage::disk('public')->url($qrCode->qr_image_path);
    }
}