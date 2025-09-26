<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParkingSession;
use App\Models\ParkingSlot;
use App\Services\RateCalculatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class QRScanningController extends Controller
{
    public function __construct(
        private RateCalculatorService $rateCalculator
    ) {}

    public function scan(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'qr_data' => 'required|string',
            'location' => 'required|array',
            'location.latitude' => 'required|numeric|between:-90,90',
            'location.longitude' => 'required|numeric|between:-180,180',
            'location.accuracy' => 'sometimes|numeric|min:0',
            'scan_timestamp' => 'sometimes|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Extract encoded data from QR URL if it's a full URL
        $qrDataString = $request->qr_data;
        if (str_starts_with($qrDataString, 'http')) {
            $path = parse_url($qrDataString, PHP_URL_PATH);
            $segments = explode('/', trim($path, '/'));
            $encodedData = end($segments);
        } else {
            $encodedData = $qrDataString;
        }

        // Decode QR data (should be base64 encoded JSON)
        try {
            $qrDecoded = base64_decode($encodedData);
            $qrData = json_decode($qrDecoded, true);

            if (! $qrData || ! isset($qrData['slot_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid QR code format',
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid QR code format',
            ], 400);
        }

        $slot = ParkingSlot::find($qrData['slot_id']);

        if (! $slot) {
            return response()->json([
                'success' => false,
                'message' => 'Parking slot not found',
            ], 404);
        }

        // Get dynamic pricing information
        $currentPricing = $this->rateCalculator->getCurrentRates($slot, now());
        $upcomingChanges = $this->rateCalculator->getUpcomingChanges($slot, now(), 12); // Next 12 hours

        // Check if slot is restricted (rate = -1)
        if ($currentPricing['current_rate'] === -1.0) {
            return response()->json([
                'success' => false,
                'message' => 'Parking is not allowed at this time',
                'restrictions' => $currentPricing['restrictions'],
            ], 409);
        }

        if ($slot->status !== 'available') {
            return response()->json([
                'success' => false,
                'message' => 'Parking slot is not available',
            ], 409);
        }

        // Generate session token for temporary reservation
        $sessionToken = Str::random(32);
        $scanId = Str::uuid();

        // For demo purposes, we'll create a temporary cache entry
        // In production, this would use Redis with expiration

        return response()->json([
            'success' => true,
            'data' => [
                'scan_id' => $scanId,
                'session_token' => $sessionToken,
                'slot_info' => [
                    'id' => $slot->id,
                    'slot_number' => $slot->slot_number,
                    'status' => $slot->status,
                    'location' => [
                        'latitude' => $slot->latitude,
                        'longitude' => $slot->longitude,
                    ],
                    'address' => $slot->address,
                ],
                'current_pricing' => [
                    'current_rate' => $currentPricing['current_rate'],
                    'rate_display' => $currentPricing['rate_display'],
                    'is_free_period' => $currentPricing['is_free_period'],
                    'base_rate' => $currentPricing['base_rate'],
                    'free_time_remaining' => $currentPricing['free_time_remaining'],
                    'restrictions' => $currentPricing['restrictions'],
                ],
                'upcoming_changes' => $upcomingChanges,
                'expires_at' => now()->addMinutes(5)->toISOString(),
            ],
        ]);
    }

    public function scanStatus(string $scanId): JsonResponse
    {
        // For now, return a simple response indicating that scan status endpoints are not implemented
        // In a full implementation, this would check cached scan results
        return response()->json([
            'success' => false,
            'message' => 'Scan status endpoint not implemented in current version',
        ], 404);
    }

    public function activatePayment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'scan_id' => 'required|string',
            'session_token' => 'required|string',
            'duration_minutes' => 'required|integer|min:15|max:720',
            'payment_method' => 'required|array',
            'payment_method.type' => 'required|in:wallet,card,bank_transfer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // For demo purposes, simulate payment processing
        // In production, this would integrate with Magpie payment gateway

        // Find the parking slot from session token (in real implementation, decode the session token)
        $slot = ParkingSlot::where('status', 'available')->first(); // Mock for demo

        if (! $slot) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid session or slot not found',
            ], 400);
        }

        $startTime = now();
        $endTime = $startTime->copy()->addMinutes($request->duration_minutes);

        // Calculate pricing with rate transitions
        $pricingInfo = $this->rateCalculator->calculateSessionRate($slot, $startTime, $endTime);

        $session = ParkingSession::create([
            'user_id' => $request->user()->id,
            'parking_slot_id' => $slot->id,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'duration_minutes' => $request->duration_minutes,
            'hourly_rate' => $slot->base_hourly_rate,
            'original_rate' => $slot->base_hourly_rate,
            'total_amount' => $pricingInfo['total_amount'],
            'final_calculated_amount' => $pricingInfo['total_amount'],
            'rate_transitions' => $pricingInfo['rate_transitions'],
            'payment_status' => 'completed',
            'payment_method' => $request->payment_method['type'],
            'status' => 'active',
            'confirmation_code' => Str::upper(Str::random(8)),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'session' => [
                    'id' => $session->id,
                    'confirmation_code' => $session->confirmation_code,
                    'start_time' => $session->start_time,
                    'end_time' => $session->end_time,
                    'duration_minutes' => $session->duration_minutes,
                    'total_amount' => $session->total_amount,
                    'rate_transitions' => $session->rate_transitions,
                    'status' => $session->status,
                ],
                'pricing_breakdown' => $pricingInfo['rate_transitions'],
            ],
        ], 201);
    }
}
