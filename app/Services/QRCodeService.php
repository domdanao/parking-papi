<?php

namespace App\Services;

use App\Models\ParkingSlot;
use App\Models\QRCode;
use App\Services\PricingService;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class QRCodeService
{
    public function __construct(
        private PricingService $pricingService
    ) {}
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

        // Create parking-specific QR data - simplified for permanent QR codes
        $qrPayload = [
            'type' => 'parking_slot',
            'slot_id' => $slot->id,
            'version' => '1.0',
        ];

        // Encode as URL that opens our app
        $encodedData = base64_encode(json_encode($qrPayload));

        return $baseUrl.'/parking/scan/'.$encodedData;
    }

    /**
     * Generate QR code image and store it
     */
    private function generateQRImage(string $qrData, string $slotId): string
    {
        $filename = 'qr-codes/slot-'.$slotId.'.svg';

        // Generate QR code with BaconQrCode
        $renderer = new ImageRenderer(
            new RendererStyle(300, 2),
            new SvgImageBackEnd
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

            if (! $qrPayload || ! isset($qrPayload['slot_id'], $qrPayload['type'])) {
                throw new \InvalidArgumentException('Invalid QR code format');
            }

            // Validate QR code type
            if ($qrPayload['type'] !== 'parking_slot') {
                throw new \InvalidArgumentException('Invalid QR code type');
            }

            // Validate slot ID format (should be UUID)
            if (! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $qrPayload['slot_id'])) {
                throw new \InvalidArgumentException('Invalid slot ID format');
            }

            return $qrPayload;
        } catch (\Exception $e) {
            throw new \InvalidArgumentException('Failed to decode QR data: '.$e->getMessage());
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
        if (! $slot) {
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
                'slot_number' => $slot->slot_number,
                'status' => $slot->status,
                'base_hourly_rate' => $slot->base_hourly_rate,
                'location' => [
                    'latitude' => $slot->latitude,
                    'longitude' => $slot->longitude,
                ],
                'address' => $slot->address,
                'landmark_references' => $slot->landmark_references,
                'description' => $slot->address ?? $slot->landmark_references ?? 'Parking Location',
                'amenities' => $slot->amenities ?? [],
                'vehicle_compatibility' => $slot->vehicle_compatibility ?? [],
                'surface_type' => $slot->surface_type,
                'dimensions' => $slot->dimensions,
                'minimum_duration_minutes' => $slot->minimum_duration_minutes,
                'maximum_duration_minutes' => $slot->maximum_duration_minutes,
                'owner' => [
                    'id' => $slot->slotOwner->id,
                    'name' => $slot->slotOwner->name,
                    'email' => $slot->slotOwner->email,
                ],
                'area' => [
                    'name' => $this->getAreaNameFromAddress($slot->address), // Extract area from address
                ],
            ],
            'session_token' => $sessionToken,
            'expires_at' => now()->addMinutes(5)->toISOString(), // 5-minute booking window
            'scan_location' => $location,
            'terms_url' => config('app.url') . '/terms-and-conditions',
            'pricing_info' => $this->calculatePricing($slot),
        ];
    }

    /**
     * Check if scan location is too far from slot
     */
    private function isLocationTooFar(ParkingSlot $slot, array $location): bool
    {
        if (! isset($location['latitude'], $location['longitude'])) {
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

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

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
     * Calculate pricing information for the slot using dynamic pricing
     */
    private function calculatePricing(ParkingSlot $slot): array
    {
        $rateInfo = $this->pricingService->getCurrentRateInfo($slot);
        $currentRate = $rateInfo['current_rate'];
        $baseRate = $rateInfo['base_rate'];

        return [
            'current_hourly_rate' => $currentRate,
            'base_hourly_rate' => $baseRate,
            'is_surge_pricing' => $rateInfo['is_surge_pricing'],
            'rate_change_coming' => $rateInfo['rate_change_coming'],
            'next_hour_rate' => $rateInfo['next_hour_rate'],
            'minimum_charge' => $currentRate, // 1 hour minimum at current rate
            'currency' => 'PHP',
            'examples' => $rateInfo['examples'],
            'pricing_note' => $rateInfo['is_surge_pricing']
                ? 'Current rate is higher than base rate due to peak hours'
                : 'Standard pricing applies',
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

        if (! $qrCode || ! $qrCode->qr_image_path) {
            return null;
        }

        return Storage::disk('public')->url($qrCode->qr_image_path);
    }

    /**
     * Extract area name from address
     */
    private function getAreaNameFromAddress(?string $address): string
    {
        if (!$address) {
            return 'Parking Area';
        }

        // Try to extract area name from common address patterns
        if (str_contains($address, 'BGC')) {
            return 'Bonifacio Global City';
        }
        if (str_contains($address, 'Makati')) {
            return 'Makati CBD';
        }
        if (str_contains($address, 'Ortigas')) {
            return 'Ortigas Center';
        }
        if (str_contains($address, 'Alabang')) {
            return 'Alabang';
        }
        if (str_contains($address, 'QC') || str_contains($address, 'Quezon')) {
            return 'Quezon City';
        }

        // Default fallback
        return 'Metro Manila';
    }
}
