<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Analytics API Contract Tests', function () {
    beforeEach(function () {
        $this->slotOwner = User::factory()->create(['role' => 'slot_owner']);
        $this->platformOwner = User::factory()->create(['role' => 'platform_owner']);
    });

    describe('GET /api/analytics/slot-performance', function () {
        it('returns slot performance metrics for slot owner', function () {
            $this->actingAs($this->slotOwner, 'sanctum');

            $response = $this->getJson('/api/analytics/slot-performance?period=month');

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'metrics' => [
                            '*' => [
                                'slot_id',
                                'total_revenue',
                                'occupancy_rate',
                                'total_sessions',
                                'average_session_duration'
                            ]
                        ],
                        'summary' => [
                            'total_revenue',
                            'average_occupancy_rate'
                        ]
                    ]
                ]);
        });
    });

    describe('GET /api/analytics/platform-health', function () {
        it('returns platform health metrics for platform owner', function () {
            $this->actingAs($this->platformOwner, 'sanctum');

            $response = $this->getJson('/api/analytics/platform-health?period=today');

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'kpis' => [
                            'total_active_sessions',
                            'total_revenue_today',
                            'active_parking_slots',
                            'registered_users'
                        ],
                        'alerts' => [
                            '*' => [
                                'type',
                                'message',
                                'severity'
                            ]
                        ]
                    ]
                ]);
        });

        it('requires platform owner role', function () {
            $this->actingAs($this->slotOwner, 'sanctum');

            $response = $this->getJson('/api/analytics/platform-health');

            $response->assertStatus(403);
        });
    });
});
