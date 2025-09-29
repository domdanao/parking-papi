<?php

namespace App\Services;

use App\Models\ParkingSlot;
use App\Models\ParkingSchedule;
use Carbon\Carbon;

class PricingService
{
    /**
     * Calculate the effective hourly rate for a parking slot at a given time
     */
    public function calculateEffectiveRate(ParkingSlot $slot, ?Carbon $dateTime = null): float
    {
        $dateTime = $dateTime ?? now();

        // Get active pricing schedules for this slot
        $activeSchedules = ParkingSchedule::where('parking_slot_id', $slot->id)
            ->where('schedule_type', 'pricing_tier')
            ->where('is_active', true)
            ->where(function ($query) use ($dateTime) {
                $query->where('effective_from', '<=', $dateTime)
                      ->where(function ($q) use ($dateTime) {
                          $q->whereNull('effective_until')
                            ->orWhere('effective_until', '>=', $dateTime);
                      });
            })
            ->orderBy('priority', 'desc')
            ->get();

        // Check if any schedule applies to the current time
        foreach ($activeSchedules as $schedule) {
            if ($this->scheduleAppliesAtTime($schedule, $dateTime)) {
                $pricingRules = $schedule->pricing_rules;
                if (isset($pricingRules['hourly_rate'])) {
                    return (float) $pricingRules['hourly_rate'];
                }
            }
        }

        // Fallback to base rate if no schedules apply
        return (float) $slot->base_hourly_rate;
    }

    /**
     * Calculate total cost for a parking session
     */
    public function calculateSessionCost(ParkingSlot $slot, Carbon $startTime, float $durationHours): array
    {
        $totalCost = 0;
        $rateBreakdown = [];
        $currentTime = $startTime->copy();
        $endTime = $startTime->copy()->addHours($durationHours);

        // Split into hourly segments to handle rate changes
        while ($currentTime < $endTime) {
            $segmentEnd = $currentTime->copy()->addHour();
            if ($segmentEnd > $endTime) {
                $segmentEnd = $endTime;
            }

            $segmentDuration = $currentTime->diffInHours($segmentEnd, true);
            $hourlyRate = $this->calculateEffectiveRate($slot, $currentTime);
            $segmentCost = $hourlyRate * $segmentDuration;

            $totalCost += $segmentCost;

            // Track rate breakdown
            $timeSlot = $currentTime->format('H:i') . '-' . $segmentEnd->format('H:i');
            $rateBreakdown[] = [
                'time_slot' => $timeSlot,
                'hourly_rate' => $hourlyRate,
                'duration_hours' => $segmentDuration,
                'cost' => $segmentCost,
            ];

            $currentTime = $segmentEnd;
        }

        return [
            'total_cost' => round($totalCost, 2),
            'rate_breakdown' => $rateBreakdown,
            'base_rate' => (float) $slot->base_hourly_rate,
            'duration_hours' => $durationHours,
        ];
    }

    /**
     * Get pricing examples for different durations
     */
    public function getPricingExamples(ParkingSlot $slot, ?Carbon $startTime = null): array
    {
        $startTime = $startTime ?? now();
        $examples = [];

        $durations = [
            '30 min' => 0.5,
            '1 hour' => 1,
            '2 hours' => 2,
            '4 hours' => 4,
            '8 hours' => 8,
            'Full day (24h)' => 24,
        ];

        foreach ($durations as $label => $hours) {
            $calculation = $this->calculateSessionCost($slot, $startTime, $hours);
            $examples[$label] = $calculation['total_cost'];
        }

        return $examples;
    }

    /**
     * Check if a schedule applies at a specific time
     */
    private function scheduleAppliesAtTime(ParkingSchedule $schedule, Carbon $dateTime): bool
    {
        $timeRules = $schedule->time_rules;
        $recurrencePattern = $schedule->recurrence_pattern;

        // Convert to business timezone (Philippine time) for schedule evaluation
        $businessTime = $dateTime->clone()->setTimezone('Asia/Manila');

        // Check day of week
        if (isset($timeRules['days_of_week'])) {
            $dayOfWeek = $businessTime->dayOfWeek === 0 ? 7 : $businessTime->dayOfWeek; // Convert Sunday from 0 to 7
            if (!in_array($dayOfWeek, $timeRules['days_of_week'])) {
                return false;
            }
        }

        // Check time range
        if (isset($timeRules['start_time'], $timeRules['end_time'])) {
            $currentTime = $businessTime->format('H:i:s');
            $startTime = $timeRules['start_time'];
            $endTime = $timeRules['end_time'];

            if ($currentTime < $startTime || $currentTime > $endTime) {
                return false;
            }
        }

        // Check recurrence pattern (weekly, daily, etc.)
        if (isset($recurrencePattern['type'])) {
            switch ($recurrencePattern['type']) {
                case 'weekly':
                    // Already handled by days_of_week check
                    break;
                case 'daily':
                    // Applies every day (no additional checks needed)
                    break;
                case 'monthly':
                    // Could add month-specific logic here
                    break;
            }
        }

        return true;
    }

    /**
     * Get current rate information for display
     */
    public function getCurrentRateInfo(ParkingSlot $slot): array
    {
        $currentRate = $this->calculateEffectiveRate($slot);
        $baseRate = (float) $slot->base_hourly_rate;

        // Check if there's a rate change coming up
        $nextHour = now()->addHour();
        $nextRate = $this->calculateEffectiveRate($slot, $nextHour);

        return [
            'current_rate' => $currentRate,
            'base_rate' => $baseRate,
            'is_surge_pricing' => $currentRate > $baseRate,
            'next_hour_rate' => $nextRate,
            'rate_change_coming' => $nextRate !== $currentRate,
            'examples' => $this->getPricingExamples($slot),
        ];
    }
}
