<?php

namespace App\Http\Controllers;

use App\Services\QRCodeService;
use App\Services\PaymentService;
use App\Models\ParkingSlot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QRCodeController extends Controller
{
    public function __construct(
        private QRCodeService $qrCodeService,
        private PaymentService $paymentService
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
     * Create Magpie checkout session for parking payment
     */
    public function bookSlot(Request $request): JsonResponse
    {
        $requestId = uniqid('book_');

        logger()->info('🎯 BOOKING REQUEST STARTED', [
            'request_id' => $requestId,
            'user_id' => auth()->id(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'request_data' => $request->all(),
        ]);

        try {
            logger()->info('📝 VALIDATING REQUEST DATA', [
                'request_id' => $requestId,
                'raw_input' => $request->all(),
            ]);

            $validated = $request->validate([
                'session_token' => 'required|string',
                'duration_hours' => 'required|numeric|min:0.5|max:24',
                'plate_number' => 'required|string|max:15',
            ]);

            logger()->info('✅ REQUEST VALIDATION PASSED', [
                'request_id' => $requestId,
                'validated_data' => $validated,
            ]);

            $userId = auth()->id(); // Can be null for anonymous users
            $sessionToken = $validated['session_token'];

            logger()->info('🔐 SESSION TOKEN PROCESSING', [
                'request_id' => $requestId,
                'user_id' => $userId,
                'is_anonymous' => $userId === null,
                'session_token_length' => strlen($sessionToken),
                'session_token_preview' => substr($sessionToken, 0, 20) . '...',
            ]);

            // Decode and validate session token
            $sessionData = $this->validateSessionToken($sessionToken);

            logger()->info('🎫 SESSION TOKEN DECODED', [
                'request_id' => $requestId,
                'session_data' => $sessionData,
            ]);

            $slot = ParkingSlot::findOrFail($sessionData['slot_id']);

            logger()->info('🅿️ PARKING SLOT LOADED', [
                'request_id' => $requestId,
                'slot_id' => $slot->id,
                'slot_status' => $slot->status,
                'slot_rate' => $slot->base_hourly_rate,
                'slot_number' => $slot->slot_number ?? 'N/A',
            ]);

            // Check if slot is still available
            if ($slot->status !== 'available') {
                logger()->warning('❌ SLOT NOT AVAILABLE', [
                    'request_id' => $requestId,
                    'slot_id' => $slot->id,
                    'current_status' => $slot->status,
                    'expected_status' => 'available',
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'This parking slot is no longer available',
                ], 400);
            }

            logger()->info('💰 CREATING PAYMENT CHECKOUT SESSION', [
                'request_id' => $requestId,
                'slot_id' => $slot->id,
                'duration_hours' => $validated['duration_hours'],
                'plate_number' => $validated['plate_number'],
            ]);

            // Create payment checkout session
            $checkoutSession = $this->paymentService->createCheckoutSession(
                $slot,
                $userId,
                $validated['duration_hours'],
                $validated['plate_number'],
                $sessionToken
            );

            logger()->info('✅ PAYMENT SESSION CREATED', [
                'request_id' => $requestId,
                'payment_session_id' => $checkoutSession['session_id'],
                'amount' => $checkoutSession['amount'],
                'checkout_data_keys' => array_keys($checkoutSession['checkout_data']),
            ]);

            logger()->info('🔗 CALLING MAGPIE MCP', [
                'request_id' => $requestId,
                'checkout_data' => $checkoutSession['checkout_data'],
            ]);

            // Use Magpie MCP to create checkout session
            $magpieResponse = $this->createMagpieCheckoutSession(
                $checkoutSession['checkout_data']
            );

            logger()->info('🎉 MAGPIE RESPONSE RECEIVED', [
                'request_id' => $requestId,
                'magpie_session_id' => $magpieResponse['session_id'],
                'checkout_url' => $magpieResponse['url'],
                'response_keys' => array_keys($magpieResponse),
            ]);

            $responseData = [
                'success' => true,
                'data' => [
                    'checkout_url' => $magpieResponse['url'],
                    'session_id' => $checkoutSession['session_id'],
                    'amount' => $checkoutSession['amount'],
                    'duration_hours' => $checkoutSession['duration_hours'],
                ],
                'message' => 'Checkout session created successfully',
            ];

            logger()->info('🚀 BOOKING REQUEST COMPLETED SUCCESSFULLY', [
                'request_id' => $requestId,
                'response_data' => $responseData,
            ]);

            return response()->json($responseData);

        } catch (ValidationException $e) {
            logger()->error('❌ VALIDATION ERROR', [
                'request_id' => $requestId,
                'errors' => $e->errors(),
                'input' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid booking data',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            logger()->error('💥 BOOKING REQUEST FAILED', [
                'request_id' => $requestId,
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'stack_trace' => $e->getTraceAsString(),
                'session_token' => $validated['session_token'] ?? null,
                'user_id' => auth()->id(),
                'request_data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Something went wrong while creating checkout session. Please try again.',
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
        logger()->info('🔍 VALIDATING SESSION TOKEN', [
            'token_length' => strlen($token),
            'token_preview' => substr($token, 0, 50) . '...',
        ]);

        try {
            $decodedToken = base64_decode($token);
            logger()->info('📋 BASE64 DECODED', [
                'decoded_length' => strlen($decodedToken),
                'decoded_content' => $decodedToken,
            ]);

            $sessionData = json_decode($decodedToken, true);
            logger()->info('🔓 JSON DECODED', [
                'session_data' => $sessionData,
                'json_error' => json_last_error_msg(),
            ]);

            if (!$sessionData) {
                logger()->error('❌ JSON DECODE FAILED', [
                    'json_error' => json_last_error_msg(),
                    'decoded_content' => $decodedToken,
                ]);
                throw new \InvalidArgumentException('Failed to decode session token JSON');
            }

            if (!isset($sessionData['slot_id'])) {
                logger()->error('❌ MISSING SLOT_ID', [
                    'available_keys' => array_keys($sessionData),
                    'session_data' => $sessionData,
                ]);
                throw new \InvalidArgumentException('Session token missing slot_id');
            }

            if (!isset($sessionData['expires_at'])) {
                logger()->error('❌ MISSING EXPIRES_AT', [
                    'available_keys' => array_keys($sessionData),
                    'session_data' => $sessionData,
                ]);
                throw new \InvalidArgumentException('Session token missing expires_at');
            }

            $currentTimestamp = now()->timestamp;
            logger()->info('⏰ CHECKING EXPIRATION', [
                'expires_at' => $sessionData['expires_at'],
                'current_timestamp' => $currentTimestamp,
                'is_expired' => $sessionData['expires_at'] < $currentTimestamp,
                'time_remaining' => $sessionData['expires_at'] - $currentTimestamp,
            ]);

            if ($sessionData['expires_at'] < $currentTimestamp) {
                logger()->warning('⚠️ SESSION TOKEN EXPIRED', [
                    'expires_at' => $sessionData['expires_at'],
                    'current_timestamp' => $currentTimestamp,
                    'expired_ago' => $currentTimestamp - $sessionData['expires_at'],
                ]);
                throw new \InvalidArgumentException('Session token has expired');
            }

            logger()->info('✅ SESSION TOKEN VALID', [
                'slot_id' => $sessionData['slot_id'],
                'expires_at' => $sessionData['expires_at'],
                'time_remaining' => $sessionData['expires_at'] - $currentTimestamp,
            ]);

            return $sessionData;

        } catch (\InvalidArgumentException $e) {
            // Re-throw validation errors as-is
            logger()->error('❌ SESSION TOKEN VALIDATION FAILED', [
                'error' => $e->getMessage(),
                'token' => $token,
            ]);
            throw $e;

        } catch (\Exception $e) {
            logger()->error('💥 SESSION TOKEN PROCESSING ERROR', [
                'error_message' => $e->getMessage(),
                'error_type' => get_class($e),
                'token' => $token,
            ]);
            throw new \InvalidArgumentException('Invalid session token format: ' . $e->getMessage());
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

    /**
     * Handle successful payment callback from Magpie
     */
    public function paymentSuccess(Request $request): Response
    {
        try {
            $sessionId = $request->get('session_id');
            $magpieSessionId = $request->get('checkout_session_id');

            if (!$sessionId) {
                return Inertia::render('parking/payment-error', [
                    'error' => 'Invalid payment session',
                    'isAuthenticated' => auth()->check(),
                ]);
            }

            // Process the successful payment
            $result = $this->paymentService->processSuccessfulPayment($sessionId, $magpieSessionId);

            return Inertia::render('parking/payment-success', [
                'parkingSession' => $result['parking_session'],
                'slot' => $result['slot'],
                'isAuthenticated' => auth()->check(),
                'user' => auth()->user(),
            ]);

        } catch (\Exception $e) {
            logger()->error('Payment success processing error: ' . $e->getMessage(), [
                'session_id' => $request->get('session_id'),
                'user_id' => auth()->id(),
                'exception' => $e,
            ]);

            return Inertia::render('parking/payment-error', [
                'error' => 'Failed to process payment. Please contact support if your payment was charged.',
                'isAuthenticated' => auth()->check(),
            ]);
        }
    }

    /**
     * Handle payment cancellation callback from Magpie
     */
    public function paymentCancel(Request $request): Response
    {
        try {
            $sessionId = $request->get('session_id');

            if ($sessionId) {
                $this->paymentService->handlePaymentCancellation($sessionId);
            }

            return Inertia::render('parking/payment-cancelled', [
                'message' => 'Payment was cancelled. You can try again anytime.',
                'isAuthenticated' => auth()->check(),
                'user' => auth()->user(),
            ]);

        } catch (\Exception $e) {
            logger()->error('Payment cancellation processing error: ' . $e->getMessage(), [
                'session_id' => $request->get('session_id'),
                'user_id' => auth()->id(),
                'exception' => $e,
            ]);

            return redirect()->route('dashboard')->with('error', 'Payment was cancelled.');
        }
    }

    /**
     * Create Magpie checkout session using MCP
     */
    private function createMagpieCheckoutSession(array $checkoutData): array
    {
        logger()->info('🔗 MAGPIE CHECKOUT SESSION START', [
            'checkout_data_summary' => [
                'currency' => $checkoutData['currency'] ?? 'unknown',
                'line_items_count' => count($checkoutData['line_items'] ?? []),
                'payment_methods' => $checkoutData['payment_method_types'] ?? [],
                'total_amount' => array_sum(array_map(fn($item) => ($item['amount'] ?? 0) * ($item['quantity'] ?? 1), $checkoutData['line_items'] ?? [])),
            ],
            'full_checkout_data' => $checkoutData,
        ]);

        try {
            // Create checkout session using the Magpie MCP server
            $response = $this->callMagpieCreateCheckoutSession($checkoutData);

            logger()->info('✅ MAGPIE CHECKOUT SESSION CREATED', [
                'response_id' => $response['id'] ?? 'unknown',
                'payment_url' => $response['payment_url'] ?? $response['url'] ?? 'missing',
                'full_response' => $response,
            ]);

            $result = [
                'url' => $response['payment_url'] ?? $response['url'] ?? null,
                'session_id' => $response['id'] ?? $response['session_id'] ?? null,
            ];

            logger()->info('🎯 MAGPIE CHECKOUT SESSION RESULT', [
                'final_url' => $result['url'],
                'final_session_id' => $result['session_id'],
            ]);

            return $result;

        } catch (\Exception $e) {
            logger()->error('💥 MAGPIE CHECKOUT SESSION FAILED', [
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'checkout_data' => $checkoutData,
                'stack_trace' => $e->getTraceAsString(),
            ]);

            throw new \Exception('Failed to create payment session: ' . $e->getMessage());
        }
    }

    /**
     * Call Magpie MCP server to create checkout session
     */
    private function callMagpieCreateCheckoutSession(array $checkoutData): array
    {
        $requestId = uniqid('magpie_');

        logger()->info('📡 MAGPIE API CALL START', [
            'request_id' => $requestId,
            'api_endpoint' => 'https://api.pay.magpie.im/',
            'method' => 'POST',
            'mcp_function' => 'mcp__magpie__create_checkout_session',
        ]);

        logger()->info('📦 MAGPIE PAYLOAD DETAILS', [
            'request_id' => $requestId,
            'payload_keys' => array_keys($checkoutData),
            'payload_size_bytes' => strlen(json_encode($checkoutData)),
            'currency' => $checkoutData['currency'] ?? 'missing',
            'mode' => $checkoutData['mode'] ?? 'missing',
            'payment_method_types' => $checkoutData['payment_method_types'] ?? [],
            'line_items_count' => count($checkoutData['line_items'] ?? []),
            'customer_name' => $checkoutData['customer_name'] ?? 'missing',
            'customer_email' => $checkoutData['customer_email'] ?? 'missing',
            'phone_number_collection' => $checkoutData['phone_number_collection'] ?? false,
        ]);

        logger()->info('📋 MAGPIE FULL PAYLOAD', [
            'request_id' => $requestId,
            'complete_payload' => $checkoutData,
        ]);

        logger()->info('💰 MAGPIE LINE ITEMS BREAKDOWN', [
            'request_id' => $requestId,
            'line_items' => $checkoutData['line_items'] ?? [],
            'total_amount_calculated' => array_sum(array_map(fn($item) => ($item['amount'] ?? 0) * ($item['quantity'] ?? 1), $checkoutData['line_items'] ?? [])),
        ]);

        logger()->info('🔗 MAGPIE URLs', [
            'request_id' => $requestId,
            'success_url' => $checkoutData['success_url'] ?? 'missing',
            'cancel_url' => $checkoutData['cancel_url'] ?? 'missing',
        ]);

        // Call the actual Magpie MCP server
        try {
            // Log the actual HTTP request details
            $apiEndpoint = 'https://api.pay.magpie.im/';
            $secretKey = env('MAGPIE_SECRET_KEY', 'sk_live_***');
            $encodedSecretKey = base64_encode($secretKey . ':');

            $requestHeaders = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Authorization' => 'Basic ' . $encodedSecretKey,
                'User-Agent' => 'ParkingPapi/1.0 Laravel/' . app()->version(),
            ];
            $requestBody = json_encode($checkoutData, JSON_PRETTY_PRINT);

            logger()->info('🌐 HTTP REQUEST DETAILS', [
                'request_id' => $requestId,
                'method' => 'POST',
                'endpoint' => $apiEndpoint,
                'headers' => $requestHeaders,
                'body_size_bytes' => strlen($requestBody),
                'secret_key_preview' => substr($secretKey, 0, 10) . '***',
                'base64_encoded_key' => $encodedSecretKey,
            ]);

            logger()->info('📤 HTTP REQUEST HEADERS', [
                'request_id' => $requestId,
                'headers' => $requestHeaders,
            ]);

            logger()->info('📝 HTTP REQUEST BODY (JSON)', [
                'request_id' => $requestId,
                'body' => $requestBody,
                'body_parsed' => $checkoutData,
            ]);

            logger()->info('🚀 INITIATING HTTP REQUEST', [
                'request_id' => $requestId,
                'timestamp' => now()->toISOString(),
                'curl_equivalent' => sprintf(
                    'curl -X POST %s -H "Content-Type: application/json" -H "Authorization: Basic %s" -d \'%s\'',
                    $apiEndpoint,
                    $encodedSecretKey,
                    json_encode($checkoutData)
                ),
            ]);

            // Make the actual HTTP call to Magpie API using Laravel's HTTP client
            $startTime = microtime(true);

            $httpResponse = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Authorization' => 'Basic ' . $encodedSecretKey,
                'User-Agent' => 'ParkingPapi/1.0 Laravel/' . app()->version(),
            ])->timeout(30)
              ->post($apiEndpoint, $checkoutData);

            $endTime = microtime(true);
            $duration = round(($endTime - $startTime) * 1000, 2); // milliseconds

            logger()->info('📥 HTTP RESPONSE RECEIVED', [
                'request_id' => $requestId,
                'status_code' => $httpResponse->status(),
                'response_time_ms' => $duration,
                'response_headers' => $httpResponse->headers(),
                'response_size_bytes' => strlen($httpResponse->body()),
                'successful' => $httpResponse->successful(),
            ]);

            logger()->info('📋 HTTP RESPONSE BODY (JSON)', [
                'request_id' => $requestId,
                'body' => $httpResponse->body(),
                'body_parsed' => $httpResponse->json(),
            ]);

            if ($httpResponse->failed()) {
                logger()->error('💥 MAGPIE API CALL FAILED', [
                    'request_id' => $requestId,
                    'status_code' => $httpResponse->status(),
                    'response_body' => $httpResponse->body(),
                    'api_endpoint' => $apiEndpoint,
                ]);

                throw new \Exception('Magpie API call failed with status ' . $httpResponse->status() . ': ' . $httpResponse->body());
            }

            $apiResponse = $httpResponse->json();

            logger()->info('✅ MAGPIE API RESPONSE SUCCESS', [
                'request_id' => $requestId,
                'response_time_ms' => $duration,
                'response_id' => $apiResponse['id'] ?? 'unknown',
                'payment_url' => $apiResponse['payment_url'] ?? 'unknown',
                'amount_total' => $apiResponse['amount_total'] ?? 0,
                'payment_status' => $apiResponse['payment_status'] ?? 'unknown',
                'expires_at' => $apiResponse['expires_at'] ?? 'unknown',
            ]);

            logger()->info('🔄 REQUEST/RESPONSE SUMMARY', [
                'request_id' => $requestId,
                'request_endpoint' => $apiEndpoint,
                'request_method' => 'POST',
                'request_size_bytes' => strlen($requestBody),
                'response_status' => $httpResponse->status(),
                'response_size_bytes' => strlen($httpResponse->body()),
                'total_time_ms' => $duration,
                'success' => $httpResponse->successful(),
            ]);

            return $apiResponse;

        } catch (\Exception $e) {
            logger()->error('💥 MAGPIE API CALL FAILED', [
                'request_id' => $requestId,
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_type' => get_class($e),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'api_endpoint' => 'https://api.pay.magpie.im/',
                'payload_sent' => $checkoutData,
                'stack_trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }
}