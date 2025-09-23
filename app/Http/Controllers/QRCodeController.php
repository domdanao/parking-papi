<?php

namespace App\Http\Controllers;

use App\Services\QRCodeService;
use App\Models\ParkingSlot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QRCodeController extends Controller
{
    public function __construct(
        private QRCodeService $qrCodeService
    ) {}

    /**
     * Handle QR code scan from URL (when user clicks QR link or scans with phone camera)
     * This endpoint is publicly accessible - no authentication required
     */
    public function handleScan(string $encodedData): Response
    {
        try {
            $userId = auth()->id(); // Can be null for unauthenticated users
            $location = $this->getLocationFromRequest(request());

            $scanResult = $this->qrCodeService->processScan($encodedData, $userId, $location);

            return Inertia::render('parking/scan-result', [
                'scanResult' => $scanResult,
                'encodedData' => $encodedData,
                'isAuthenticated' => auth()->check(),
                'user' => auth()->user(),
            ]);

        } catch (\InvalidArgumentException $e) {
            return Inertia::render('parking/scan-error', [
                'error' => $e->getMessage(),
                'encodedData' => $encodedData,
                'isAuthenticated' => auth()->check(),
            ]);
        } catch (\Exception $e) {
            logger()->error('QR scan error: ' . $e->getMessage(), [
                'encoded_data' => $encodedData,
                'user_id' => auth()->id(),
                'exception' => $e,
            ]);

            return Inertia::render('parking/scan-error', [
                'error' => 'Something went wrong while processing the QR code. Please try again.',
                'encodedData' => $encodedData,
                'isAuthenticated' => auth()->check(),
            ]);
        }
    }

    /**
     * Process QR code scan via API (from PWA scanner)
     */
    public function processScan(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'qr_data' => 'required|string',
                'location' => 'nullable|array',
                'location.latitude' => 'required_with:location|numeric|between:-90,90',
                'location.longitude' => 'required_with:location|numeric|between:-180,180',
                'location.accuracy' => 'nullable|numeric|min:0',
            ]);

            $userId = auth()->id();
            $qrData = $validated['qr_data'];
            $location = $validated['location'] ?? null;

            // Extract encoded data from QR URL if it's a full URL
            $encodedData = $this->extractEncodedDataFromQR($qrData);

            $scanResult = $this->qrCodeService->processScan($encodedData, $userId, $location);

            return response()->json([
                'success' => true,
                'data' => $scanResult,
                'message' => 'QR code scanned successfully',
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid scan data',
                'errors' => $e->errors(),
            ], 422);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);

        } catch (\Exception $e) {
            logger()->error('API QR scan error: ' . $e->getMessage(), [
                'qr_data' => $validated['qr_data'] ?? null,
                'user_id' => auth()->id(),
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Something went wrong while processing the QR code. Please try again.',
            ], 500);
        }
    }

    /**
     * Book parking slot after QR scan
     */
    public function bookSlot(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'session_token' => 'required|string',
                'duration_hours' => 'required|numeric|min:0.5|max:24',
                'plate_number' => 'required|string|max:15',
                'payment_method' => 'required|string|in:credit_card,digital_wallet,cash',
            ]);

            $userId = auth()->id();
            $sessionToken = $validated['session_token'];

            // Decode and validate session token
            $sessionData = $this->validateSessionToken($sessionToken);

            $slot = ParkingSlot::findOrFail($sessionData['slot_id']);

            // Check if slot is still available
            if ($slot->status !== 'available') {
                return response()->json([
                    'success' => false,
                    'message' => 'This parking slot is no longer available',
                ], 400);
            }

            // Calculate pricing
            $duration = $validated['duration_hours'];
            $amount = $slot->base_hourly_rate * $duration;

            // Create parking session (this would integrate with payment processing)
            $session = $this->createParkingSession($slot, $userId, $duration, $amount);

            // Broadcast slot status change
            broadcast(new \App\Events\SlotStatusChanged($slot, 'available', 'reserved'));

            return response()->json([
                'success' => true,
                'data' => [
                    'session' => [
                        'id' => $session->id,
                        'confirmation_code' => $session->confirmation_code,
                        'status' => $session->status,
                        'amount' => $session->amount,
                        'expires_at' => $session->expires_at->toISOString(),
                    ],
                    'slot' => [
                        'id' => $slot->id,
                        'status' => 'reserved',
                    ],
                ],
                'message' => 'Parking slot booked successfully',
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid booking data',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            logger()->error('Slot booking error: ' . $e->getMessage(), [
                'session_token' => $validated['session_token'] ?? null,
                'user_id' => auth()->id(),
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Something went wrong while booking the slot. Please try again.',
            ], 500);
        }
    }

    /**
     * Get QR code image for a parking slot
     */
    public function getQRCodeImage(ParkingSlot $slot): JsonResponse
    {
        try {
            $qrCodeUrl = $this->qrCodeService->getQRCodeUrl($slot);

            if (!$qrCodeUrl) {
                // Generate QR code if it doesn't exist
                $this->qrCodeService->generateQRCodeForSlot($slot);
                $qrCodeUrl = $this->qrCodeService->getQRCodeUrl($slot);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'qr_code_url' => $qrCodeUrl,
                    'slot_id' => $slot->id,
                ],
            ]);

        } catch (\Exception $e) {
            logger()->error('QR code image error: ' . $e->getMessage(), [
                'slot_id' => $slot->id,
                'exception' => $e,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Could not generate QR code for this slot',
            ], 500);
        }
    }

    /**
     * Extract encoded data from QR code string
     */
    private function extractEncodedDataFromQR(string $qrData): string
    {
        // If it's a full URL, extract the encoded part
        if (str_starts_with($qrData, 'http')) {
            $path = parse_url($qrData, PHP_URL_PATH);
            $segments = explode('/', trim($path, '/'));
            $encodedData = end($segments);
        } else {
            $encodedData = $qrData;
        }

        return $encodedData;
    }

    /**
     * Get location data from request
     */
    private function getLocationFromRequest(Request $request): ?array
    {
        if ($request->has(['latitude', 'longitude'])) {
            return [
                'latitude' => (float) $request->get('latitude'),
                'longitude' => (float) $request->get('longitude'),
                'accuracy' => $request->get('accuracy'),
            ];
        }

        return null;
    }

    /**
     * Validate session token
     */
    private function validateSessionToken(string $token): array
    {
        try {
            $sessionData = json_decode(base64_decode($token), true);

            if (!$sessionData || !isset($sessionData['slot_id'], $sessionData['expires_at'])) {
                throw new \InvalidArgumentException('Invalid session token');
            }

            if ($sessionData['expires_at'] < now()->timestamp) {
                throw new \InvalidArgumentException('Session token has expired');
            }

            return $sessionData;

        } catch (\Exception $e) {
            throw new \InvalidArgumentException('Invalid session token format');
        }
    }

    /**
     * Create parking session
     */
    private function createParkingSession(ParkingSlot $slot, string $userId, float $duration, float $amount): object
    {
        // This would create an actual ParkingSession model
        // For now, return a mock object
        return (object) [
            'id' => \Illuminate\Support\Str::uuid(),
            'confirmation_code' => strtoupper(\Illuminate\Support\Str::random(8)),
            'status' => 'pending',
            'amount' => $amount,
            'expires_at' => now()->addHours($duration),
        ];
    }
}