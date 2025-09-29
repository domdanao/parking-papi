<?php

namespace App\Services;

use App\Models\ParkingSlot;
use App\Models\ParkingSession;
use Carbon\Carbon;
use Exception;

class PaymentService
{
    public function __construct(
        private PricingService $pricingService
    ) {}

    /**
     * Create a Magpie checkout session for parking payment
     */
    public function createCheckoutSession(
        ParkingSlot $slot,
        ?string $userId,
        float $durationHours,
        string $plateNumber,
        string $sessionToken
    ): array {
        $sessionId = \Illuminate\Support\Str::uuid()->toString();

        logger()->info('💰 PAYMENT SERVICE: CREATING CHECKOUT SESSION', [
            'session_id' => $sessionId,
            'slot_id' => $slot->id,
            'user_id' => $userId,
            'is_anonymous' => $userId === null,
            'duration_hours' => $durationHours,
            'plate_number' => $plateNumber,
            'slot_rate' => $slot->base_hourly_rate,
        ]);

        try {
            // Calculate pricing
            $startTime = now();

            logger()->info('🧮 CALCULATING PRICING', [
                'session_id' => $sessionId,
                'start_time' => $startTime->toISOString(),
                'duration_hours' => $durationHours,
                'base_rate' => $slot->base_hourly_rate,
            ]);

            $costCalculation = $this->pricingService->calculateSessionCost($slot, $startTime, $durationHours);
            $totalAmount = $costCalculation['total_cost'];

            logger()->info('✅ PRICING CALCULATED', [
                'session_id' => $sessionId,
                'total_amount' => $totalAmount,
                'cost_breakdown' => $costCalculation,
            ]);

            // Convert to cents for Magpie (assuming PHP currency)
            $amountInCents = (int) round($totalAmount * 100);

            logger()->info('💱 AMOUNT CONVERSION', [
                'session_id' => $sessionId,
                'amount_peso' => $totalAmount,
                'amount_cents' => $amountInCents,
            ]);

            // Build line items for the checkout
            $lineItems = [
                [
                    'name' => "Parking Slot #{$this->getDisplaySlotId($slot)}",
                    'description' => sprintf(
                        '%s parking at %s',
                        $this->formatDuration($durationHours),
                        $slot->location_description ?? 'Location'
                    ),
                    'quantity' => 1,
                    'amount' => $amountInCents,
                    'image' => asset('images/parking_icon_01.png'),
                ]
            ];

            // Add rate breakdown as additional line items if surge pricing
            if (count($costCalculation['rate_breakdown']) > 1) {
                $lineItems = $this->buildDetailedLineItems($costCalculation['rate_breakdown'], $slot);
            }

            // Create checkout session using MCP Magpie server
            $checkoutData = [
                'currency' => 'php',
                'mode' => 'payment',
                'payment_method_types' => ['card', 'qrph'],
                'phone_number_collection' => true,
                'line_items' => $lineItems,
                'customer_name' => auth()->user()?->name ?? 'Parking Customer',
                'customer_email' => auth()->user()?->email ?? null,
                'success_url' => route('parking.payment.success') . '?session_id=' . $sessionId,
                'cancel_url' => route('parking.scan', ['encodedData' => $sessionToken]),
            ];

            logger()->info('📋 BUILDING LINE ITEMS', [
                'session_id' => $sessionId,
                'line_items_count' => count($lineItems),
                'has_surge_pricing' => count($costCalculation['rate_breakdown']) > 1,
            ]);

            // Add rate breakdown as additional line items if surge pricing
            if (count($costCalculation['rate_breakdown']) > 1) {
                $lineItems = $this->buildDetailedLineItems($costCalculation['rate_breakdown'], $slot);
                logger()->info('📊 DETAILED LINE ITEMS CREATED', [
                    'session_id' => $sessionId,
                    'detailed_items_count' => count($lineItems),
                ]);
            }

            logger()->info('🔧 BUILDING CHECKOUT DATA', [
                'session_id' => $sessionId,
                'customer_name' => auth()->user()?->name ?? 'Parking Customer',
                'customer_email' => auth()->user()?->email ?? null,
                'success_url' => route('parking.payment.success') . '?session_id=' . $sessionId,
                'cancel_url' => route('parking.scan', ['encodedData' => $sessionToken]),
            ]);

            // Store session metadata for processing after payment
            $metadata = [
                'slot_id' => $slot->id,
                'user_id' => $userId,
                'duration_hours' => $durationHours,
                'plate_number' => $plateNumber,
                'session_token' => $sessionToken,
                'amount' => $totalAmount,
                'cost_calculation' => $costCalculation,
                'created_at' => now()->toISOString(),
            ];

            logger()->info('💾 STORING SESSION METADATA', [
                'session_id' => $sessionId,
                'metadata_keys' => array_keys($metadata),
            ]);

            $this->storeSessionMetadata($sessionId, $metadata);

            $result = [
                'session_id' => $sessionId,
                'checkout_data' => $checkoutData,
                'amount' => $totalAmount,
                'duration_hours' => $durationHours,
            ];

            logger()->info('🎉 PAYMENT CHECKOUT SESSION COMPLETED', [
                'session_id' => $sessionId,
                'result_keys' => array_keys($result),
                'total_amount' => $totalAmount,
            ]);

            return $result;

        } catch (Exception $e) {
            logger()->error('💥 PAYMENT CHECKOUT SESSION FAILED', [
                'session_id' => $sessionId ?? 'unknown',
                'slot_id' => $slot->id,
                'user_id' => $userId,
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'stack_trace' => $e->getTraceAsString(),
            ]);

            throw new Exception('Failed to create payment session: ' . $e->getMessage());
        }
    }

    /**
     * Process successful payment and create parking session
     */
    public function processSuccessfulPayment(string $sessionId, string $magpieSessionId): array
    {
        try {
            // Retrieve stored session metadata
            $metadata = $this->getSessionMetadata($sessionId);
            if (!$metadata) {
                throw new Exception('Session metadata not found');
            }

            // Verify the slot is still available
            $slot = ParkingSlot::findOrFail($metadata['slot_id']);
            if ($slot->status !== 'available') {
                throw new Exception('Parking slot is no longer available');
            }

            // Create parking session
            $parkingSession = $this->createParkingSession($metadata);

            // Update slot status
            $slot->update(['status' => 'occupied']);

            // Broadcast status change
            broadcast(new \App\Events\SlotStatusChanged($slot, 'available', 'occupied'));

            // Clean up session metadata
            $this->removeSessionMetadata($sessionId);

            return [
                'parking_session' => $parkingSession,
                'slot' => $slot,
                'magpie_session_id' => $magpieSessionId,
            ];

        } catch (Exception $e) {
            logger()->error('Payment processing failed', [
                'session_id' => $sessionId,
                'magpie_session_id' => $magpieSessionId,
                'error' => $e->getMessage(),
                'exception' => $e,
            ]);

            throw new Exception('Failed to process payment: ' . $e->getMessage());
        }
    }

    /**
     * Handle payment cancellation
     */
    public function handlePaymentCancellation(string $sessionId): void
    {
        // Clean up session metadata
        $this->removeSessionMetadata($sessionId);

        logger()->info('Payment cancelled', ['session_id' => $sessionId]);
    }

    /**
     * Store session metadata in cache/database
     */
    private function storeSessionMetadata(string $sessionId, array $metadata): void
    {
        // Store in cache with 1 hour expiration
        cache()->put("payment_session:{$sessionId}", $metadata, now()->addHour());
    }

    /**
     * Retrieve session metadata
     */
    private function getSessionMetadata(string $sessionId): ?array
    {
        return cache()->get("payment_session:{$sessionId}");
    }

    /**
     * Remove session metadata
     */
    private function removeSessionMetadata(string $sessionId): void
    {
        cache()->forget("payment_session:{$sessionId}");
    }

    /**
     * Create parking session from metadata
     */
    private function createParkingSession(array $metadata): object
    {
        // This would create an actual ParkingSession model
        // For now, return a mock object matching the existing pattern
        $confirmationCode = strtoupper(\Illuminate\Support\Str::random(8));
        $expiresAt = now()->addHours($metadata['duration_hours']);

        return (object) [
            'id' => \Illuminate\Support\Str::uuid(),
            'user_id' => $metadata['user_id'], // Can be null for anonymous users
            'parking_slot_id' => $metadata['slot_id'],
            'plate_number' => $metadata['plate_number'],
            'duration_hours' => $metadata['duration_hours'],
            'amount' => $metadata['amount'],
            'confirmation_code' => $confirmationCode,
            'status' => 'active',
            'started_at' => now(),
            'expires_at' => $expiresAt,
            'cost_calculation' => $metadata['cost_calculation'],
            'is_anonymous' => $metadata['user_id'] === null,
        ];
    }

    /**
     * Build detailed line items for complex pricing
     */
    private function buildDetailedLineItems(array $rateBreakdown, ParkingSlot $slot): array
    {
        $items = [];
        $slotId = $this->getDisplaySlotId($slot);

        foreach ($rateBreakdown as $segment) {
            $segmentAmount = (int) round($segment['cost'] * 100); // Convert to cents

            $items[] = [
                'name' => "Parking Slot #{$slotId} ({$segment['time_slot']})",
                'description' => sprintf(
                    '₱%.2f/hr × %.1f hrs',
                    $segment['hourly_rate'],
                    $segment['duration_hours']
                ),
                'quantity' => 1,
                'amount' => $segmentAmount,
                'image' => asset('images/parking_icon_01.png'),
            ];
        }

        return $items;
    }

    /**
     * Get display-friendly slot ID
     */
    private function getDisplaySlotId(ParkingSlot $slot): string
    {
        return $slot->slot_number ?? $slot->id->toString()->substr(-8);
    }

    /**
     * Format duration for display
     */
    private function formatDuration(float $hours): string
    {
        if ($hours < 1) {
            return sprintf('%d minutes', (int) ($hours * 60));
        } elseif ($hours == 1) {
            return '1 hour';
        } elseif ($hours == (int) $hours) {
            return sprintf('%d hours', (int) $hours);
        } else {
            $fullHours = (int) $hours;
            $minutes = (int) (($hours - $fullHours) * 60);
            return sprintf('%d hours %d minutes', $fullHours, $minutes);
        }
    }
}