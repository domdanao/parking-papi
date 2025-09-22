<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('QR Scanning API Contract Tests', function () {
    beforeEach(function () {
        $this->vehicleOwner = User::factory()->create(['role' => 'vehicle_owner']);
        $this->slotOwner = User::factory()->create(['role' => 'slot_owner']);

        // Create parking slot for QR scanning
        $this->parkingSlot = \App\Models\ParkingSlot::factory()->create([
            'id' => '550e8400-e29b-41d4-a716-446655440000',
            'slot_owner_id' => $this->slotOwner->id,
            'status' => 'available',
            'approval_status' => 'published',
            'is_active' => true
        ]);
    });

    describe('POST /api/qr/scan', function () {
        it('processes QR code scan successfully', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->postJson('/api/qr/scan', [
                'qr_data' => 'eyJzbG90X2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIn0=',
                'location' => [
                    'latitude' => 40.7128,
                    'longitude' => -74.0060,
                    'accuracy' => 10.0
                ],
                'scan_timestamp' => '2025-09-22T14:30:00Z'
            ]);

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'scan_id',
                        'session_token',
                        'slot_info' => [
                            'id',
                            'slot_number',
                            'hourly_rate',
                            'status'
                        ],
                        'expires_at'
                    ]
                ]);
        });

        it('validates QR data format', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->postJson('/api/qr/scan', [
                'qr_data' => 'invalid-qr-data'
            ]);

            $response->assertStatus(422);
        });
    });

    describe('POST /api/qr/activate-payment', function () {
        it('activates parking session with payment', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->postJson('/api/qr/activate-payment', [
                'scan_id' => 'scan-123',
                'session_token' => 'token-456',
                'duration_minutes' => 120,
                'payment_method' => [
                    'type' => 'wallet'
                ]
            ]);

            $response->assertStatus(201)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'session' => [
                            'id',
                            'confirmation_code',
                            'start_time',
                            'end_time',
                            'total_amount',
                            'status'
                        ]
                    ]
                ]);
        });
    });
});
