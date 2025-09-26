<?php

use App\Models\ParkingSchedule;
use App\Models\ParkingSession;
use App\Models\ParkingSlot;
use App\Models\User;
use App\Services\SessionTransitionService;

beforeEach(function () {
    $this->user = User::factory()->create(['role' => 'vehicle_owner']);
    $this->slotOwner = User::factory()->create(['role' => 'slot_owner']);

    $this->slot = ParkingSlot::factory()->create([
        'slot_owner_id' => $this->slotOwner->id,
        'base_hourly_rate' => 50.00,
        'status' => 'available',
    ]);

    $this->service = app(SessionTransitionService::class);
});

test('processes rate transition from paid to free', function () {
    // Create a session that will transition to free period
    $session = ParkingSession::factory()->create([
        'user_id' => $this->user->id,
        'parking_slot_id' => $this->slot->id,
        'start_time' => now()->subHour(),
        'end_time' => now()->addHour(),
        'duration_minutes' => 120,
        'total_amount' => 100.00,
        'status' => 'active',
    ]);

    // Create a schedule that makes parking free starting now
    ParkingSchedule::create([
        'parking_slot_id' => $this->slot->id,
        'schedule_type' => 'free_period',
        'time_rules' => [
            'days_of_week' => [0, 1, 2, 3, 4, 5, 6],
            'start_time' => now()->format('H:i:s'),
            'end_time' => now()->addHours(2)->format('H:i:s'),
        ],
        'pricing_rules' => ['message' => 'Free period'],
        'recurrence_pattern' => ['type' => 'weekly'],
        'effective_from' => now()->subDay(),
        'is_active' => true,
        'priority' => 1,
    ]);

    $result = $this->service->processSessionTransition($session);

    expect($result['changed'])->toBeTrue();
    expect($result['transition_type'])->toBe('paid_to_free_refund');
    expect($result['new_total'])->toBeLessThan($session->total_amount);

    // Verify session was updated
    $session->refresh();
    expect($session->final_calculated_amount)->not->toBeNull();
    expect($session->rate_transitions)->not->toBeNull();
});

test('processes rate transition from free to paid', function () {
    // Create a session during free period
    $session = ParkingSession::factory()->create([
        'user_id' => $this->user->id,
        'parking_slot_id' => $this->slot->id,
        'start_time' => now()->subHour(),
        'end_time' => now()->addHour(),
        'duration_minutes' => 120,
        'total_amount' => 0.00, // Free initially
        'status' => 'active',
    ]);

    // Create a schedule that makes parking paid starting now
    ParkingSchedule::create([
        'parking_slot_id' => $this->slot->id,
        'schedule_type' => 'pricing_tier',
        'time_rules' => [
            'days_of_week' => [0, 1, 2, 3, 4, 5, 6],
            'start_time' => now()->format('H:i:s'),
            'end_time' => now()->addHours(2)->format('H:i:s'),
        ],
        'pricing_rules' => ['hourly_rate' => 75.00],
        'recurrence_pattern' => ['type' => 'weekly'],
        'effective_from' => now()->subDay(),
        'is_active' => true,
        'priority' => 1,
    ]);

    $result = $this->service->processSessionTransition($session);

    expect($result['changed'])->toBeTrue();
    expect($result['transition_type'])->toBe('rate_increase_charge');
    expect($result['new_total'])->toBeGreaterThan($session->total_amount);
});

test('gets upcoming transitions correctly', function () {
    $session = ParkingSession::factory()->create([
        'user_id' => $this->user->id,
        'parking_slot_id' => $this->slot->id,
        'start_time' => now(),
        'end_time' => now()->addHours(3),
        'duration_minutes' => 180,
        'total_amount' => 150.00,
        'status' => 'active',
    ]);

    // Create a schedule that will activate in 30 minutes
    ParkingSchedule::create([
        'parking_slot_id' => $this->slot->id,
        'schedule_type' => 'free_period',
        'time_rules' => [
            'days_of_week' => [0, 1, 2, 3, 4, 5, 6],
            'start_time' => now()->addMinutes(30)->format('H:i:s'),
            'end_time' => now()->addHours(2)->format('H:i:s'),
        ],
        'pricing_rules' => ['message' => 'Happy hour - free parking'],
        'recurrence_pattern' => ['type' => 'weekly'],
        'effective_from' => now()->subDay(),
        'is_active' => true,
        'priority' => 1,
    ]);

    $upcomingTransitions = $this->service->getUpcomingTransitions($session, 60);

    expect($upcomingTransitions)->not->toBeEmpty();
    expect($upcomingTransitions[0]['new_rate'])->toBe(0.0); // Should be free
    expect($upcomingTransitions[0]['minutes_from_now'])->toBeLessThanOrEqual(35); // Should be around 30 minutes
});

test('no transition when no schedule changes', function () {
    // Create session with rate matching the slot's base rate
    $session = ParkingSession::factory()->create([
        'user_id' => $this->user->id,
        'parking_slot_id' => $this->slot->id,
        'start_time' => now()->subHour(),
        'end_time' => now()->addHour(),
        'duration_minutes' => 120,
        'hourly_rate' => $this->slot->base_hourly_rate, // Match the slot rate
        'total_amount' => $this->slot->base_hourly_rate * 2, // 2 hours
        'original_rate' => $this->slot->base_hourly_rate,
        'status' => 'active',
    ]);

    // No schedules that would cause transitions
    $result = $this->service->processSessionTransition($session);

    expect($result['changed'])->toBeFalse();
    expect($result['message'])->toBe('No immediate transition needed');
});

test('processes multiple active sessions', function () {
    // Create multiple active sessions
    $session1 = ParkingSession::factory()->create([
        'user_id' => $this->user->id,
        'parking_slot_id' => $this->slot->id,
        'start_time' => now()->subHour(),
        'end_time' => now()->addHour(),
        'total_amount' => 100.00,
        'status' => 'active',
    ]);

    $session2 = ParkingSession::factory()->create([
        'user_id' => $this->user->id,
        'parking_slot_id' => $this->slot->id,
        'start_time' => now()->subMinutes(30),
        'end_time' => now()->addMinutes(90),
        'total_amount' => 75.00,
        'status' => 'active',
    ]);

    // Create a completed session (should be ignored)
    ParkingSession::factory()->create([
        'user_id' => $this->user->id,
        'parking_slot_id' => $this->slot->id,
        'status' => 'completed',
    ]);

    // Create schedule that affects current time
    ParkingSchedule::create([
        'parking_slot_id' => $this->slot->id,
        'schedule_type' => 'free_period',
        'time_rules' => [
            'days_of_week' => [0, 1, 2, 3, 4, 5, 6],
            'start_time' => now()->format('H:i:s'),
            'end_time' => now()->addHours(2)->format('H:i:s'),
        ],
        'pricing_rules' => ['message' => 'Free period'],
        'recurrence_pattern' => ['type' => 'weekly'],
        'effective_from' => now()->subDay(),
        'is_active' => true,
        'priority' => 1,
    ]);

    $results = $this->service->processActiveSessionTransitions();

    // Should process both active sessions
    expect($results)->toHaveCount(2);
    expect($results[0]['changed'])->toBeTrue();
    expect($results[1]['changed'])->toBeTrue();
});
