<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParkingSlot;
use App\Models\ParkingSession;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class QRScanningController extends Controller
{
    public function scan(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'qr_data' => 'required|string',
            'location' => 'required|array',
            'location.latitude' => 'required|numeric|between:-90,90',
            'location.longitude' => 'required|numeric|between:-180,180',
            'location.accuracy' => 'sometimes|numeric|min:0',
            'scan_timestamp' => 'sometimes|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Decode QR data (should be base64 encoded JSON)
        try {
            $qrDecoded = base64_decode($request->qr_data);
            $qrData = json_decode($qrDecoded, true);

            if (!$qrData || !isset($qrData['slot_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid QR code format'
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid QR code format'
            ], 400);
        }

        $slot = ParkingSlot::find($qrData['slot_id']);

        if (!$slot) {
            return response()->json([
                'success' => false,
                'message' => 'Parking slot not found'
            ], 404);
        }

        if ($slot->status !== 'available') {
            return response()->json([
                'success' => false,
                'message' => 'Parking slot is not available'
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
                    'hourly_rate' => $slot->base_hourly_rate,
                    'status' => $slot->status
                ],
                'expires_at' => now()->addMinutes(5)->toISOString()
            ]
        ]);
    }

    public function activatePayment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'scan_id' => 'required|string',
            'session_token' => 'required|string',
            'duration_minutes' => 'required|integer|min:15|max:720',
            'payment_method' => 'required|array',
            'payment_method.type' => 'required|in:wallet,card,bank_transfer'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        // For demo purposes, simulate payment processing
        // In production, this would integrate with Magpie payment gateway

        $startTime = now();
        $endTime = $startTime->copy()->addMinutes($request->duration_minutes);
        $hourlyRate = 15.00; // Mock rate, should come from slot
        $totalAmount = ($request->duration_minutes / 60) * $hourlyRate;

        $session = ParkingSession::create([
            'user_id' => $request->user()->id,
            'parking_slot_id' => '550e8400-e29b-41d4-a716-446655440000', // Mock slot ID
            'start_time' => $startTime,
            'end_time' => $endTime,
            'duration_minutes' => $request->duration_minutes,
            'hourly_rate' => $hourlyRate,
            'total_amount' => $totalAmount,
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
                    'total_amount' => $session->total_amount,
                    'status' => $session->status
                ]
            ]
        ], 201);
    }
}
