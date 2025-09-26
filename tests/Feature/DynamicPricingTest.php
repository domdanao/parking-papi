<?php

namespace Tests\Feature;

use App\Models\ParkingSchedule;
use App\Models\ParkingSlot;
use App\Models\User;
use App\Services\RateCalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DynamicPricingTest extends TestCase
{
    use RefreshDatabase;

    private User $slotOwner;

    private ParkingSlot $parkingSlot;

    private RateCalculatorService $rateCalculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->slotOwner = User::factory()->create(['role' => 'slot_owner']);

        $this->parkingSlot = ParkingSlot::factory()->create([
            'slot_owner_id' => $this->slotOwner->id,
            'base_hourly_rate' => 50.00,
            'status' => 'available',
            'approval_status' => 'approved',
        ]);

        $this->rateCalculator = app(RateCalculatorService::class);
    }

    public function test_base_rate_when_no_schedules(): void
    {
        $rates = $this->rateCalculator->getCurrentRates($this->parkingSlot, now());

        $this->assertEquals(50.00, $rates['current_rate']);
        $this->assertEquals('₱50/hour', $rates['rate_display']);
        $this->assertFalse($rates['is_free_period']);
        $this->assertEquals(50.00, $rates['base_rate']);
    }

    public function test_free_period_schedule(): void
    {
        // Create a free period schedule for weekends
        ParkingSchedule::create([
            'parking_slot_id' => $this->parkingSlot->id,
            'schedule_type' => 'free_period',
            'recurrence_pattern' => ['type' => 'weekly'],
            'time_rules' => [
                'days_of_week' => [0, 6], // Sunday and Saturday
                'start_time' => '00:00:00',
                'end_time' => '23:59:59',
            ],
            'pricing_rules' => ['message' => 'Free weekend parking'],
            'effective_from' => now()->subDays(30),
            'effective_until' => now()->addDays(30),
            'is_active' => true,
            'priority' => 1,
            'name' => 'Weekend Free Parking',
        ]);

        // Test on a Saturday (day 6)
        $saturday = now()->startOfWeek()->addDays(5); // Saturday
        $rates = $this->rateCalculator->getCurrentRates($this->parkingSlot, $saturday);

        $this->assertEquals(0.0, $rates['current_rate']);
        $this->assertEquals('FREE', $rates['rate_display']);
        $this->assertTrue($rates['is_free_period']);

        // Test on a Monday (day 1) - should use base rate
        $monday = now()->startOfWeek()->addDays(0); // Monday
        $rates = $this->rateCalculator->getCurrentRates($this->parkingSlot, $monday);

        $this->assertEquals(50.00, $rates['current_rate']);
        $this->assertEquals('₱50/hour', $rates['rate_display']);
        $this->assertFalse($rates['is_free_period']);
    }

    public function test_pricing_tier_schedule(): void
    {
        // Create a peak hour pricing schedule
        ParkingSchedule::create([
            'parking_slot_id' => $this->parkingSlot->id,
            'schedule_type' => 'pricing_tier',
            'recurrence_pattern' => ['type' => 'weekly'],
            'time_rules' => [
                'days_of_week' => [1, 2, 3, 4, 5], // Monday to Friday
                'start_time' => '08:00:00',
                'end_time' => '18:00:00',
            ],
            'pricing_rules' => ['hourly_rate' => 75.00],
            'effective_from' => now()->subDays(30),
            'effective_until' => now()->addDays(30),
            'is_active' => true,
            'priority' => 1,
            'name' => 'Peak Hour Pricing',
        ]);

        // Test during peak hours
        $weekdayMorning = now()->startOfWeek()->addDays(1)->setHour(10); // Tuesday 10 AM
        $rates = $this->rateCalculator->getCurrentRates($this->parkingSlot, $weekdayMorning);

        $this->assertEquals(75.00, $rates['current_rate']);
        $this->assertEquals('₱75/hour', $rates['rate_display']);
        $this->assertFalse($rates['is_free_period']);

        // Test outside peak hours
        $weekdayEvening = now()->startOfWeek()->addDays(1)->setHour(19); // Tuesday 7 PM
        $rates = $this->rateCalculator->getCurrentRates($this->parkingSlot, $weekdayEvening);

        $this->assertEquals(50.00, $rates['current_rate']); // Should use base rate
        $this->assertEquals('₱50/hour', $rates['rate_display']);
    }

    public function test_restriction_zone_schedule(): void
    {
        // Create a rush hour restriction
        ParkingSchedule::create([
            'parking_slot_id' => $this->parkingSlot->id,
            'schedule_type' => 'restriction_zone',
            'recurrence_pattern' => ['type' => 'weekly'],
            'time_rules' => [
                'days_of_week' => [1, 2, 3, 4, 5], // Monday to Friday
                'start_time' => '07:00:00',
                'end_time' => '09:00:00',
            ],
            'pricing_rules' => ['restriction_message' => 'No parking during rush hour'],
            'effective_from' => now()->subDays(30),
            'effective_until' => now()->addDays(30),
            'is_active' => true,
            'priority' => 1,
            'name' => 'Rush Hour Restriction',
        ]);

        // Test during restricted hours
        $weekdayRushHour = now()->startOfWeek()->addDays(1)->setHour(8); // Tuesday 8 AM
        $rates = $this->rateCalculator->getCurrentRates($this->parkingSlot, $weekdayRushHour);

        $this->assertEquals(-1.0, $rates['current_rate']);
        $this->assertEquals('NO PARKING', $rates['rate_display']);
        $this->assertFalse($rates['is_free_period']);
        $this->assertContains('No parking during rush hour', $rates['restrictions']);
    }

    public function test_session_rate_calculation_with_transitions(): void
    {
        // Create a schedule that changes during the session
        ParkingSchedule::create([
            'parking_slot_id' => $this->parkingSlot->id,
            'schedule_type' => 'pricing_tier',
            'recurrence_pattern' => ['type' => 'weekly'],
            'time_rules' => [
                'days_of_week' => [1, 2, 3, 4, 5, 6, 0], // All days
                'start_time' => '14:00:00',
                'end_time' => '16:00:00',
            ],
            'pricing_rules' => ['hourly_rate' => 100.00],
            'effective_from' => now()->subDays(30),
            'effective_until' => now()->addDays(30),
            'is_active' => true,
            'priority' => 1,
            'name' => 'Afternoon Peak',
        ]);

        // Session from 13:00 to 17:00 (4 hours)
        $startTime = now()->setHour(13)->setMinute(0)->setSecond(0);
        $endTime = $startTime->copy()->addHours(4);

        $sessionRate = $this->rateCalculator->calculateSessionRate($this->parkingSlot, $startTime, $endTime);

        // Should have multiple rate transitions:
        // 13:00-14:00 (1 hour) at base rate ₱50
        // 14:00-16:00 (2 hours) at peak rate ₱100
        // 16:00-17:00 (1 hour) at base rate ₱50
        // Total: 50 + 200 + 50 = ₱300

        $this->assertGreaterThan(200, $sessionRate['total_amount']);
        $this->assertEquals(240, $sessionRate['duration_minutes']);
        $this->assertNotEmpty($sessionRate['rate_transitions']);
    }

    public function test_upcoming_rate_changes(): void
    {
        // Create a schedule that will change rates
        ParkingSchedule::create([
            'parking_slot_id' => $this->parkingSlot->id,
            'schedule_type' => 'free_period',
            'recurrence_pattern' => ['type' => 'weekly'],
            'time_rules' => [
                'days_of_week' => [1, 2, 3, 4, 5, 6, 0], // All days
                'start_time' => '20:00:00',
                'end_time' => '06:00:00', // Overnight free parking
            ],
            'pricing_rules' => ['message' => 'Free overnight parking'],
            'effective_from' => now()->subDays(30),
            'effective_until' => now()->addDays(30),
            'is_active' => true,
            'priority' => 1,
            'name' => 'Overnight Free',
        ]);

        // Check upcoming changes from 6 PM
        $currentTime = now()->setHour(18)->setMinute(0)->setSecond(0);
        $upcomingChanges = $this->rateCalculator->getUpcomingChanges($this->parkingSlot, $currentTime, 6);

        $this->assertNotEmpty($upcomingChanges);

        // Should find the transition to free period at 8 PM
        $hasFreeTransition = collect($upcomingChanges)->contains(function ($change) {
            return $change['rate'] === 0.0 && $change['change_type'] === 'paid_to_free';
        });

        $this->assertTrue($hasFreeTransition);
    }
}
