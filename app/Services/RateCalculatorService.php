<?php

namespace App\Services;

use App\Models\ParkingSchedule;
use App\Models\ParkingSlot;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class RateCalculatorService
{
    /**
     * Get current rates for a parking slot at a specific time
     */
    public function getCurrentRates(ParkingSlot $slot, Carbon $datetime): array
    {
        $activeSchedules = $this->getActiveSchedulesForSlot($slot, $datetime);

        $currentRate = $this->calculateCurrentRate($slot, $activeSchedules);
        $restrictions = $this->getRestrictions($activeSchedules);
        $freeTimeRemaining = $this->getFreeTimeRemaining($activeSchedules, $datetime);

        return [
            'current_rate' => $currentRate,
            'rate_display' => $this->formatRateDisplay($currentRate),
            'restrictions' => $restrictions,
            'free_time_remaining' => $freeTimeRemaining,
            'is_free_period' => $currentRate === 0.0,
            'base_rate' => $slot->base_hourly_rate,
        ];
    }

    /**
     * Get upcoming rate changes for a parking slot
     */
    public function getUpcomingChanges(ParkingSlot $slot, Carbon $datetime, int $hoursAhead = 24): array
    {
        $upcomingChanges = [];
        $currentDateTime = $datetime->copy();
        $endDateTime = $datetime->copy()->addHours($hoursAhead);

        while ($currentDateTime->lt($endDateTime)) {
            $nextHour = $currentDateTime->copy()->addHour();
            $currentRates = $this->getCurrentRates($slot, $currentDateTime);
            $nextRates = $this->getCurrentRates($slot, $nextHour);

            if ($currentRates['current_rate'] !== $nextRates['current_rate']) {
                $upcomingChanges[] = [
                    'time' => $nextHour->format('g:i A'),
                    'datetime' => $nextHour,
                    'rate' => $nextRates['current_rate'],
                    'rate_display' => $nextRates['rate_display'],
                    'change_type' => $this->determineChangeType($currentRates['current_rate'], $nextRates['current_rate']),
                ];
            }

            $currentDateTime = $nextHour;
        }

        return collect($upcomingChanges)->take(5)->toArray(); // Limit to next 5 changes
    }

    /**
     * Calculate rate for a parking session with transitions
     */
    public function calculateSessionRate(ParkingSlot $slot, Carbon $startTime, Carbon $endTime): array
    {
        $transitions = [];
        $totalAmount = 0;
        $currentTime = $startTime->copy();

        while ($currentTime->lt($endTime)) {
            $nextTransition = $this->getNextRateTransition($slot, $currentTime, $endTime);
            $segmentEndTime = $nextTransition ? $nextTransition['datetime'] : $endTime;

            $rates = $this->getCurrentRates($slot, $currentTime);
            $segmentDurationMinutes = $currentTime->diffInMinutes($segmentEndTime);
            $segmentHours = $segmentDurationMinutes / 60;
            $segmentAmount = $rates['current_rate'] * $segmentHours;

            $transitions[] = [
                'start_time' => $currentTime->copy(),
                'end_time' => $segmentEndTime->copy(),
                'rate' => $rates['current_rate'],
                'duration_minutes' => $segmentDurationMinutes,
                'amount' => $segmentAmount,
                'rate_display' => $rates['rate_display'],
            ];

            $totalAmount += $segmentAmount;
            $currentTime = $segmentEndTime;
        }

        return [
            'total_amount' => round($totalAmount, 2),
            'rate_transitions' => $transitions,
            'duration_minutes' => $startTime->diffInMinutes($endTime),
        ];
    }

    /**
     * Get active schedules for a parking slot at a specific time
     */
    private function getActiveSchedulesForSlot(ParkingSlot $slot, Carbon $datetime): Collection
    {
        return ParkingSchedule::activeForSlot($slot->id)
            ->get()
            ->filter(function ($schedule) use ($datetime) {
                return $schedule->matchesCurrentTime($datetime);
            });
    }

    /**
     * Calculate the current rate based on active schedules
     */
    private function calculateCurrentRate(ParkingSlot $slot, Collection $activeSchedules): float
    {
        // Check for free periods first (highest priority conceptually)
        $freePeriod = $activeSchedules->where('schedule_type', 'free_period')->first();
        if ($freePeriod) {
            return 0.0;
        }

        // Check for restriction zones
        $restriction = $activeSchedules->where('schedule_type', 'restriction_zone')->first();
        if ($restriction) {
            // Return -1 to indicate parking is not allowed
            return -1.0;
        }

        // Check for pricing tiers (ordered by priority)
        $pricingTier = $activeSchedules->where('schedule_type', 'pricing_tier')
            ->sortByDesc('priority')
            ->first();

        if ($pricingTier) {
            return $pricingTier->getCurrentRate() ?? $slot->base_hourly_rate;
        }

        // Fall back to base rate
        return $slot->base_hourly_rate;
    }

    /**
     * Get restrictions from active schedules
     */
    private function getRestrictions(Collection $activeSchedules): array
    {
        $restrictions = [];

        $restrictionZones = $activeSchedules->where('schedule_type', 'restriction_zone');
        foreach ($restrictionZones as $restriction) {
            if (isset($restriction->pricing_rules['restriction_message'])) {
                $restrictions[] = $restriction->pricing_rules['restriction_message'];
            }
        }

        return $restrictions;
    }

    /**
     * Get remaining free time if in a free period
     */
    private function getFreeTimeRemaining(Collection $activeSchedules, Carbon $datetime): ?array
    {
        $freePeriod = $activeSchedules->where('schedule_type', 'free_period')->first();

        if (! $freePeriod) {
            return null;
        }

        $timeRules = $freePeriod->time_rules;
        if (! isset($timeRules['end_time'])) {
            return null; // Indefinite free period
        }

        $endTime = Carbon::createFromFormat('H:i:s', $timeRules['end_time'], $datetime->timezone);
        if ($endTime->lt($datetime)) {
            $endTime->addDay(); // Next day
        }

        $remainingMinutes = $datetime->diffInMinutes($endTime);

        return [
            'minutes' => $remainingMinutes,
            'hours' => floor($remainingMinutes / 60),
            'display' => $this->formatDuration($remainingMinutes),
            'ends_at' => $endTime,
        ];
    }

    /**
     * Format rate display
     */
    private function formatRateDisplay(float $rate): string
    {
        if ($rate === -1.0) {
            return 'NO PARKING';
        }

        if ($rate === 0.0) {
            return 'FREE';
        }

        return "₱{$rate}/hour";
    }

    /**
     * Get the next rate transition for a slot
     */
    private function getNextRateTransition(ParkingSlot $slot, Carbon $fromTime, Carbon $maxTime): ?array
    {
        $checkTime = $fromTime->copy();
        $currentRate = $this->getCurrentRates($slot, $checkTime)['current_rate'];

        // Check every 15 minutes for rate changes
        while ($checkTime->lt($maxTime)) {
            $checkTime->addMinutes(15);
            $newRate = $this->getCurrentRates($slot, $checkTime)['current_rate'];

            if ($newRate !== $currentRate) {
                return [
                    'datetime' => $checkTime,
                    'rate' => $newRate,
                ];
            }
        }

        return null;
    }

    /**
     * Determine the type of rate change
     */
    private function determineChangeType(float $currentRate, float $newRate): string
    {
        if ($currentRate === 0.0 && $newRate > 0.0) {
            return 'free_to_paid';
        }

        if ($currentRate > 0.0 && $newRate === 0.0) {
            return 'paid_to_free';
        }

        if ($currentRate === -1.0 && $newRate >= 0.0) {
            return 'restricted_to_available';
        }

        if ($currentRate >= 0.0 && $newRate === -1.0) {
            return 'available_to_restricted';
        }

        if ($newRate > $currentRate) {
            return 'rate_increase';
        }

        if ($newRate < $currentRate) {
            return 'rate_decrease';
        }

        return 'no_change';
    }

    /**
     * Format duration for display
     */
    private function formatDuration(int $minutes): string
    {
        if ($minutes < 60) {
            return "{$minutes}m";
        }

        $hours = floor($minutes / 60);
        $remainingMinutes = $minutes % 60;

        if ($remainingMinutes === 0) {
            return "{$hours}h";
        }

        return "{$hours}h {$remainingMinutes}m";
    }
}
