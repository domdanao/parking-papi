<?php

namespace App\Services;

use App\Events\RateTransitionOccurred;
use App\Events\RefundProcessed;
use App\Models\ParkingSession;
use App\Models\ParkingSlot;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SessionTransitionService
{
    public function __construct(
        private RateCalculatorService $rateCalculator
    ) {}

    /**
     * Process rate transitions for all active sessions
     */
    public function processActiveSessionTransitions(): array
    {
        $activeSessions = ParkingSession::where('status', 'active')
            ->where('end_time', '>', now())
            ->with('parkingSlot')
            ->get();

        $processedSessions = [];

        foreach ($activeSessions as $session) {
            $result = $this->processSessionTransition($session);
            if ($result['changed']) {
                $processedSessions[] = $result;
            }
        }

        return $processedSessions;
    }

    /**
     * Process rate transition for a specific session
     */
    public function processSessionTransition(ParkingSession $session): array
    {
        if (! $session->parkingSlot) {
            Log::warning("Session {$session->id} has no associated parking slot");

            return ['changed' => false, 'error' => 'No parking slot'];
        }

        $currentTime = now();
        $slot = $session->parkingSlot;

        // Get current and next rate changes
        $currentRates = $this->rateCalculator->getCurrentRates($slot, $currentTime);
        $nextTransition = $this->getNextTransitionTime($slot, $currentTime, $session->end_time);

        // Check if current rate differs from session's original rate
        $originalRate = $session->original_rate ?? $session->hourly_rate;
        $currentRate = $currentRates['current_rate'];

        // If rates are different, we need to process a transition
        $hasImmediateTransition = abs($currentRate - $originalRate) > 0.01;

        if (! $hasImmediateTransition && (! $nextTransition || $nextTransition['time']->gt($currentTime->copy()->addMinute()))) {
            return ['changed' => false, 'message' => 'No immediate transition needed'];
        }

        return DB::transaction(function () use ($session, $slot, $currentTime, $nextTransition, $currentRates, $hasImmediateTransition, $originalRate, $currentRate) {
            // If there's an immediate transition but no future transition, create a synthetic transition
            if ($hasImmediateTransition && ! $nextTransition) {
                $nextTransition = [
                    'time' => $currentTime,
                    'old_rate' => $originalRate,
                    'new_rate' => $currentRate,
                    'rate_display' => $currentRates['rate_display'],
                ];
            }

            return $this->executeSessionTransition($session, $slot, $currentTime, $nextTransition, $currentRates);
        });
    }

    /**
     * Execute the actual session transition with database updates
     */
    private function executeSessionTransition(
        ParkingSession $session,
        ParkingSlot $slot,
        Carbon $currentTime,
        array $nextTransition,
        array $currentRates
    ): array {
        $originalTransitions = $session->rate_transitions ?? [];
        $transitionTime = $nextTransition['time'];

        // Recalculate the session from current time to end
        $remainingSessionRate = $this->rateCalculator->calculateSessionRate(
            $slot,
            $currentTime,
            $session->end_time
        );

        // Calculate what we've already charged up to this point
        $alreadyPaidFor = $this->calculateAlreadyPaid($session, $currentTime);

        // Calculate new total amount
        $newTotalAmount = $alreadyPaidFor + $remainingSessionRate['total_amount'];

        // Determine if we need refund or additional charge
        $amountDifference = $newTotalAmount - $session->total_amount;
        $transitionType = $this->determineTransitionType($amountDifference, $currentRates);

        // Update session with new transitions
        $updatedTransitions = $this->mergeTransitions($originalTransitions, $remainingSessionRate['rate_transitions']);

        $session->update([
            'rate_transitions' => $updatedTransitions,
            'final_calculated_amount' => $newTotalAmount,
        ]);

        // Process refund or additional charge
        $paymentResult = null;
        if (abs($amountDifference) > 0.01) { // Only process if difference is significant
            $paymentResult = $this->processPaymentAdjustment($session, $amountDifference, $transitionType);
        }

        // Broadcast transition event
        broadcast(new RateTransitionOccurred([
            'session_id' => $session->id,
            'user_id' => $session->user_id,
            'slot_id' => $session->parking_slot_id,
            'transition_type' => $transitionType,
            'amount_difference' => $amountDifference,
            'new_rate' => $currentRates['current_rate'],
            'transition_time' => $transitionTime,
        ]));

        return [
            'changed' => true,
            'session_id' => $session->id,
            'transition_type' => $transitionType,
            'amount_difference' => $amountDifference,
            'new_total' => $newTotalAmount,
            'payment_result' => $paymentResult,
            'transition_time' => $transitionTime,
        ];
    }

    /**
     * Calculate how much has been paid for up to current time
     */
    private function calculateAlreadyPaid(ParkingSession $session, Carbon $currentTime): float
    {
        $elapsedMinutes = $session->start_time->diffInMinutes($currentTime);
        $elapsedRatio = $elapsedMinutes / $session->duration_minutes;

        // Use the original calculated amount for what's been consumed
        return $session->total_amount * min(1.0, $elapsedRatio);
    }

    /**
     * Get the next rate transition time within the session period
     */
    public function getNextTransitionTime(ParkingSlot $slot, Carbon $from, Carbon $until): ?array
    {
        $checkTime = $from->copy();
        $currentRate = $this->rateCalculator->getCurrentRates($slot, $checkTime)['current_rate'];

        // Check every minute for precision
        while ($checkTime->lt($until)) {
            $checkTime->addMinute();
            $newRates = $this->rateCalculator->getCurrentRates($slot, $checkTime);

            if ($newRates['current_rate'] !== $currentRate) {
                return [
                    'time' => $checkTime,
                    'old_rate' => $currentRate,
                    'new_rate' => $newRates['current_rate'],
                    'rate_display' => $newRates['rate_display'],
                ];
            }
        }

        return null;
    }

    /**
     * Determine the type of transition based on amount difference and rates
     */
    private function determineTransitionType(float $amountDifference, array $currentRates): string
    {
        if ($amountDifference < -0.01) {
            if ($currentRates['is_free_period']) {
                return 'paid_to_free_refund';
            }

            return 'rate_decrease_refund';
        }

        if ($amountDifference > 0.01) {
            if ($currentRates['current_rate'] === -1.0) {
                return 'restricted_additional_charge';
            }

            return 'rate_increase_charge';
        }

        return 'no_change';
    }

    /**
     * Merge original transitions with new remaining transitions
     */
    private function mergeTransitions(array $originalTransitions, array $newTransitions): array
    {
        $merged = [];
        $currentTime = now();

        // Add already completed transitions
        foreach ($originalTransitions as $transition) {
            $transitionEnd = Carbon::parse($transition['end_time']);
            if ($transitionEnd->lte($currentTime)) {
                $merged[] = $transition;
            }
        }

        // Add new transitions for remaining time
        foreach ($newTransitions as $transition) {
            $merged[] = $transition;
        }

        return $merged;
    }

    /**
     * Process payment adjustment (refund or additional charge)
     */
    private function processPaymentAdjustment(
        ParkingSession $session,
        float $amountDifference,
        string $transitionType
    ): array {
        if ($amountDifference < 0) {
            // Process refund
            return $this->processRefund($session, abs($amountDifference), $transitionType);
        } else {
            // Process additional charge
            return $this->processAdditionalCharge($session, $amountDifference, $transitionType);
        }
    }

    /**
     * Process automatic refund
     */
    private function processRefund(ParkingSession $session, float $refundAmount, string $transitionType): array
    {
        // In production, integrate with payment gateway for actual refund
        Log::info('Processing refund', [
            'session_id' => $session->id,
            'user_id' => $session->user_id,
            'amount' => $refundAmount,
            'reason' => $transitionType,
        ]);

        // Simulate successful refund processing
        $refundResult = [
            'status' => 'processed',
            'amount' => $refundAmount,
            'refund_id' => 'ref_'.uniqid(),
            'processed_at' => now(),
        ];

        // Broadcast refund event
        broadcast(new RefundProcessed([
            'session_id' => $session->id,
            'user_id' => $session->user_id,
            'amount' => $refundAmount,
            'reason' => $transitionType,
            'refund_id' => $refundResult['refund_id'],
        ]));

        return $refundResult;
    }

    /**
     * Process additional charge
     */
    private function processAdditionalCharge(ParkingSession $session, float $chargeAmount, string $transitionType): array
    {
        // In production, this would attempt to charge the stored payment method
        Log::info('Processing additional charge', [
            'session_id' => $session->id,
            'user_id' => $session->user_id,
            'amount' => $chargeAmount,
            'reason' => $transitionType,
        ]);

        // For demo, we'll assume successful charge
        // In production, handle payment failures gracefully
        return [
            'status' => 'charged',
            'amount' => $chargeAmount,
            'charge_id' => 'chg_'.uniqid(),
            'processed_at' => now(),
        ];
    }

    /**
     * Get upcoming transitions for a session (for user notifications)
     */
    public function getUpcomingTransitions(ParkingSession $session, int $minutesAhead = 60): array
    {
        if (! $session->parkingSlot) {
            return [];
        }

        $currentTime = now();
        $endTime = $currentTime->copy()->addMinutes($minutesAhead);

        // Don't look beyond session end time
        $searchUntil = $session->end_time->lt($endTime) ? $session->end_time : $endTime;

        $transitions = [];
        $checkTime = $currentTime->copy();
        $currentRate = $this->rateCalculator->getCurrentRates($session->parkingSlot, $checkTime)['current_rate'];

        while ($checkTime->lt($searchUntil)) {
            $checkTime->addMinutes(5); // Check every 5 minutes for transitions
            $newRates = $this->rateCalculator->getCurrentRates($session->parkingSlot, $checkTime);

            if ($newRates['current_rate'] !== $currentRate) {
                $transitions[] = [
                    'time' => $checkTime->copy(),
                    'old_rate' => $currentRate,
                    'new_rate' => $newRates['current_rate'],
                    'rate_display' => $newRates['rate_display'],
                    'transition_type' => $this->determineTransitionType(
                        $newRates['current_rate'] - $currentRate,
                        $newRates
                    ),
                    'minutes_from_now' => $currentTime->diffInMinutes($checkTime),
                ];

                $currentRate = $newRates['current_rate'];
            }
        }

        return $transitions;
    }

    /**
     * Send rate change notifications to users
     */
    public function sendRateChangeNotifications(): int
    {
        $activeSessions = ParkingSession::where('status', 'active')
            ->where('end_time', '>', now()->addMinutes(15)) // At least 15 min remaining
            ->with('user', 'parkingSlot')
            ->get();

        $notificationsSent = 0;

        foreach ($activeSessions as $session) {
            $upcomingTransitions = $this->getUpcomingTransitions($session, 15);

            if (! empty($upcomingTransitions)) {
                // Send notification about upcoming rate changes
                $this->sendTransitionNotification($session, $upcomingTransitions[0]);
                $notificationsSent++;
            }
        }

        return $notificationsSent;
    }

    /**
     * Send individual transition notification
     */
    private function sendTransitionNotification(ParkingSession $session, array $transition): void
    {
        // In production, integrate with notification service (push notifications, SMS, email)
        Log::info('Sending rate transition notification', [
            'user_id' => $session->user_id,
            'session_id' => $session->id,
            'transition_time' => $transition['time'],
            'transition_type' => $transition['transition_type'],
            'new_rate' => $transition['new_rate'],
        ]);

        // Broadcast real-time notification
        broadcast(new \App\Events\RateChangeWarning([
            'user_id' => $session->user_id,
            'session_id' => $session->id,
            'message' => $this->buildNotificationMessage($transition),
            'transition' => $transition,
        ]));
    }

    /**
     * Build user-friendly notification message
     */
    private function buildNotificationMessage(array $transition): string
    {
        $timeText = $transition['minutes_from_now'].' minutes';

        if ($transition['new_rate'] === 0.0) {
            return "Good news! Your parking will become FREE in {$timeText}.";
        }

        if ($transition['new_rate'] === -1.0) {
            return "Warning: Parking restrictions begin in {$timeText}. Please move your vehicle.";
        }

        if ($transition['new_rate'] > $transition['old_rate']) {
            return "Rate will increase to {$transition['rate_display']} in {$timeText}.";
        }

        return "Rate will decrease to {$transition['rate_display']} in {$timeText}.";
    }
}
