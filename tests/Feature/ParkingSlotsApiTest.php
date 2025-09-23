<?php

use App\Models\User;
use App\Models\ParkingSlot;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Parking Slots API Contract Tests', function () {
    beforeEach(function () {
        $this->vehicleOwner = User::factory()->create(['role' => 'vehicle_owner']);
        $this->slotOwner = User::factory()->create(['role' => 'slot_owner']);

        // Create a specific parking slot for testing
        $this->parkingSlot = ParkingSlot::factory()->create([
            'id' => '550e8400-e29b-41d4-a716-446655440000',
            'slot_owner_id' => $this->slotOwner->id,
            'status' => 'available',
            'approval_status' => 'published',
            'is_active' => true
        ]);
    });

    describe('GET /api/parking-slots/nearby', function () {
        it('finds nearby parking slots successfully', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->getJson('/api/parking-slots/nearby?' . http_build_query([
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'radius' => 1000,
                'vehicle_type' => 'car',
                'limit' => 20
            ]));

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'slots' => [
                            '*' => [
                                'id',
                                'slot_number',
                                'latitude',
                                'longitude',
                                'address',
                                'base_hourly_rate',
                                'status',
                                'amenities',
                                'vehicle_compatibility',
                                'distance_meters',
                                'estimated_walk_time_minutes',
                                'photos'
                            ]
                        ],
                        'total',
                        'current_location' => [
                            'latitude',
                            'longitude'
                        ],
                        'search_radius_meters'
                    ]
                ])
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'current_location' => [
                            'latitude' => 40.7128,
                            'longitude' => -74.0060
                        ],
                        'search_radius_meters' => 1000
                    ]
                ]);
        });

        it('filters by vehicle type', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->getJson('/api/parking-slots/nearby?' . http_build_query([
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'vehicle_type' => 'motorcycle'
            ]));

            $response->assertStatus(200)
                ->assertJson(['success' => true]);
        });

        it('filters by amenities', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->getJson('/api/parking-slots/nearby?' . http_build_query([
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'amenities' => ['covered', 'secured']
            ]));

            $response->assertStatus(200)
                ->assertJson(['success' => true]);
        });

        it('filters by max price', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->getJson('/api/parking-slots/nearby?' . http_build_query([
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'max_price' => 25.00
            ]));

            $response->assertStatus(200);
        });

        it('validates required coordinates', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->getJson('/api/parking-slots/nearby');

            $response->assertStatus(422)
                ->assertJsonPath('errors.latitude', fn ($errors) => !empty($errors))
                ->assertJsonPath('errors.longitude', fn ($errors) => !empty($errors));
        });

        it('requires authentication', function () {
            $response = $this->getJson('/api/parking-slots/nearby?latitude=40.7128&longitude=-74.0060');

            $response->assertStatus(401);
        });
    });

    describe('POST /api/parking-slots', function () {
        it('creates parking slot successfully', function () {
            $this->actingAs($this->slotOwner, 'sanctum');

            $response = $this->postJson('/api/parking-slots', [
                'slot_number' => 'A-123',
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'address' => '123 Main St, New York, NY 10001',
                'dimensions' => [
                    'length_meters' => 5.0,
                    'width_meters' => 2.5,
                    'height_clearance_meters' => 2.1
                ],
                'surface_type' => 'asphalt',
                'vehicle_compatibility' => ['car', 'motorcycle'],
                'base_hourly_rate' => 15.00,
                'minimum_duration_minutes' => 30,
                'maximum_duration_minutes' => 480,
                'amenities' => ['covered', 'secured'],
                'special_conditions' => 'No overnight parking'
            ]);

            $response->assertStatus(201)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'slot' => [
                            'id',
                            'slot_number',
                            'latitude',
                            'longitude',
                            'status',
                            'approval_status',
                            'base_hourly_rate',
                            'created_at',
                            'updated_at'
                        ]
                    ]
                ])
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'slot' => [
                            'slot_number' => 'A-123',
                            'approval_status' => 'submitted',
                            'status' => 'available'
                        ]
                    ]
                ]);
        });

        it('requires slot owner role', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->postJson('/api/parking-slots', [
                'slot_number' => 'A-123',
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'address' => '123 Main St',
                'base_hourly_rate' => 15.00
            ]);

            $response->assertStatus(403);
        });

        it('validates required fields', function () {
            $this->actingAs($this->slotOwner, 'sanctum');

            $response = $this->postJson('/api/parking-slots', []);

            $response->assertStatus(422)
                ->assertJsonPath('errors.slot_number', fn ($errors) => !empty($errors))
                ->assertJsonPath('errors.latitude', fn ($errors) => !empty($errors))
                ->assertJsonPath('errors.longitude', fn ($errors) => !empty($errors))
                ->assertJsonPath('errors.address', fn ($errors) => !empty($errors))
                ->assertJsonPath('errors.base_hourly_rate', fn ($errors) => !empty($errors));
        });
    });

    describe('GET /api/parking-slots/{id}', function () {
        it('returns parking slot details', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->getJson('/api/parking-slots/550e8400-e29b-41d4-a716-446655440000');

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'slot' => [
                            'id',
                            'slot_number',
                            'latitude',
                            'longitude',
                            'address',
                            'dimensions',
                            'surface_type',
                            'vehicle_compatibility',
                            'base_hourly_rate',
                            'pricing_variations',
                            'amenities',
                            'restrictions',
                            'status',
                            'photos',
                            'owner' => [
                                'id',
                                'first_name',
                                'rating'
                            ]
                        ]
                    ]
                ]);
        });

        it('returns 404 for non-existent slot', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->getJson('/api/parking-slots/non-existent-id');

            $response->assertStatus(404);
        });
    });

    describe('PUT /api/parking-slots/{id}', function () {
        it('updates own parking slot', function () {
            $this->actingAs($this->slotOwner, 'sanctum');

            $response = $this->putJson('/api/parking-slots/550e8400-e29b-41d4-a716-446655440000', [
                'base_hourly_rate' => 20.00,
                'amenities' => ['covered', 'secured', 'ev_charging'],
                'special_conditions' => 'Updated conditions'
            ]);

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'slot' => [
                            'base_hourly_rate' => 20.00
                        ]
                    ]
                ]);
        });

        it('prevents updating other owners slots', function () {
            $otherSlotOwner = User::factory()->create(['role' => 'slot_owner']);
            $this->actingAs($otherSlotOwner, 'sanctum');

            $response = $this->putJson('/api/parking-slots/550e8400-e29b-41d4-a716-446655440000', [
                'base_hourly_rate' => 20.00
            ]);

            $response->assertStatus(403);
        });
    });

    describe('DELETE /api/parking-slots/{id}', function () {
        it('soft deletes own parking slot', function () {
            $this->actingAs($this->slotOwner, 'sanctum');

            $response = $this->deleteJson('/api/parking-slots/550e8400-e29b-41d4-a716-446655440000');

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Parking slot deleted successfully'
                ]);
        });
    });

    describe('GET /api/parking-slots/{id}/availability', function () {
        it('returns slot availability for date range', function () {
            $this->actingAs($this->vehicleOwner, 'sanctum');

            $response = $this->getJson('/api/parking-slots/550e8400-e29b-41d4-a716-446655440000/availability?' . http_build_query([
                'start_date' => '2025-09-23',
                'end_date' => '2025-09-25'
            ]));

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'slot_id',
                        'availability' => [
                            '*' => [
                                'date',
                                'available_hours' => [
                                    '*' => [
                                        'hour',
                                        'available',
                                        'price'
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]);
        });
    });
});
