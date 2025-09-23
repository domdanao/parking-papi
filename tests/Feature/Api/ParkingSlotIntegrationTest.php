<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\ParkingSlot;
use App\Services\CacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ParkingSlotIntegrationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private User $user;
    private User $slotOwner;
    private ParkingSlot $parkingSlot;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test users
        $this->user = User::factory()->create([
            'role' => 'vehicle_owner',
            'email_verified_at' => now(),
            'mobile_verified_at' => now(),
        ]);

        $this->slotOwner = User::factory()->create([
            'role' => 'slot_owner',
            'email_verified_at' => now(),
            'mobile_verified_at' => now(),
        ]);

        // Create test parking slot
        $this->parkingSlot = ParkingSlot::factory()->create([
            'slot_owner_id' => $this->slotOwner->id,
            'status' => 'available',
            'approval_status' => 'published',
            'is_active' => true,
            'latitude' => 14.5995,
            'longitude' => 120.9842, // Manila coordinates
            'base_hourly_rate' => 50.00,
        ]);
    }

    public function test_nearby_slots_returns_available_slots(): void
    {
        Sanctum::actingAs($this->user, ['*']);

        $response = $this->getJson('/api/parking-slots/nearby', [
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'radius' => 1000,
        ]);

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
                        ]
                    ],
                    'total',
                    'current_location',
                    'search_radius_meters',
                ]
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'current_location' => [
                        'latitude' => 14.5995,
                        'longitude' => 120.9842,
                    ],
                    'search_radius_meters' => 1000,
                ]
            ]);

        $this->assertGreaterThan(0, $response->json('data.total'));
    }

    public function test_nearby_slots_caches_results(): void
    {
        Sanctum::actingAs($this->user, ['*']);

        $cacheService = app(CacheService::class);

        // Clear any existing cache
        $cacheService->invalidateNearbySlots();

        // First request should hit database
        $response1 = $this->getJson('/api/parking-slots/nearby', [
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'radius' => 1000,
        ]);

        $response1->assertStatus(200);
        $this->assertFalse($response1->json('data.from_cache', false));

        // Second request should hit cache
        $response2 = $this->getJson('/api/parking-slots/nearby', [
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'radius' => 1000,
        ]);

        $response2->assertStatus(200);
        $this->assertTrue($response2->json('data.from_cache', false));
    }

    public function test_nearby_slots_validation_errors(): void
    {
        Sanctum::actingAs($this->user, ['*']);

        // Missing latitude
        $response = $this->getJson('/api/parking-slots/nearby', [
            'longitude' => 120.9842,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['latitude']);

        // Invalid latitude range
        $response = $this->getJson('/api/parking-slots/nearby', [
            'latitude' => 95.0, // > 90
            'longitude' => 120.9842,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['latitude']);

        // Invalid radius
        $response = $this->getJson('/api/parking-slots/nearby', [
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'radius' => 50, // < 100 minimum
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['radius']);
    }

    public function test_nearby_slots_filtering_by_price(): void
    {
        Sanctum::actingAs($this->user, ['*']);

        // Create expensive slot
        ParkingSlot::factory()->create([
            'slot_owner_id' => $this->slotOwner->id,
            'status' => 'available',
            'approval_status' => 'published',
            'is_active' => true,
            'latitude' => 14.5996,
            'longitude' => 120.9843,
            'base_hourly_rate' => 200.00,
        ]);

        // Request with max price filter
        $response = $this->getJson('/api/parking-slots/nearby', [
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'radius' => 1000,
            'max_price' => 100.00,
        ]);

        $response->assertStatus(200);

        $slots = $response->json('data.slots');
        foreach ($slots as $slot) {
            $this->assertLessThanOrEqual(100.00, $slot['base_hourly_rate']);
        }
    }

    public function test_parking_slot_creation_by_slot_owner(): void
    {
        Sanctum::actingAs($this->slotOwner, ['*']);

        $slotData = [
            'slot_number' => 'TEST-001',
            'latitude' => 14.6000,
            'longitude' => 120.9850,
            'address' => '123 Test Street, Manila',
            'base_hourly_rate' => 75.50,
            'dimensions' => [
                'length_meters' => 5.0,
                'width_meters' => 2.5,
                'height_clearance_meters' => 2.0,
            ],
            'surface_type' => 'concrete',
            'vehicle_compatibility' => ['car', 'motorcycle'],
            'amenities' => ['covered', 'secured'],
            'minimum_duration_minutes' => 60,
            'maximum_duration_minutes' => 480,
        ];

        $response = $this->postJson('/api/parking-slots', $slotData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'slot_number',
                    'latitude',
                    'longitude',
                    'address',
                    'base_hourly_rate',
                    'status',
                    'approval_status',
                    'slot_owner_id',
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'slot_number' => 'TEST-001',
                    'slot_owner_id' => $this->slotOwner->id,
                    'status' => 'available',
                    'approval_status' => 'draft',
                ]
            ]);

        $this->assertDatabaseHas('parking_slots', [
            'slot_number' => 'TEST-001',
            'slot_owner_id' => $this->slotOwner->id,
            'latitude' => 14.6000,
            'longitude' => 120.9850,
        ]);
    }

    public function test_vehicle_owner_cannot_create_parking_slot(): void
    {
        Sanctum::actingAs($this->user, ['*']); // vehicle_owner

        $slotData = [
            'slot_number' => 'UNAUTHORIZED-001',
            'latitude' => 14.6000,
            'longitude' => 120.9850,
            'address' => '123 Test Street, Manila',
            'base_hourly_rate' => 75.50,
        ];

        $response = $this->postJson('/api/parking-slots', $slotData);

        $response->assertStatus(403);
    }

    public function test_parking_slot_update_by_owner(): void
    {
        Sanctum::actingAs($this->slotOwner, ['*']);

        $updateData = [
            'base_hourly_rate' => 60.00,
            'amenities' => ['covered', 'secured', 'ev_charging'],
            'status' => 'maintenance',
        ];

        $response = $this->putJson("/api/parking-slots/{$this->parkingSlot->id}", $updateData);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $this->parkingSlot->id,
                    'base_hourly_rate' => 60.00,
                    'status' => 'maintenance',
                ]
            ]);

        $this->assertDatabaseHas('parking_slots', [
            'id' => $this->parkingSlot->id,
            'base_hourly_rate' => 60.00,
            'status' => 'maintenance',
        ]);
    }

    public function test_parking_slot_update_unauthorized(): void
    {
        Sanctum::actingAs($this->user, ['*']); // Different user

        $updateData = [
            'base_hourly_rate' => 60.00,
        ];

        $response = $this->putJson("/api/parking-slots/{$this->parkingSlot->id}", $updateData);

        $response->assertStatus(403);
    }

    public function test_parking_slot_details_retrieval(): void
    {
        Sanctum::actingAs($this->user, ['*']);

        $response = $this->getJson("/api/parking-slots/{$this->parkingSlot->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'slot_number',
                    'latitude',
                    'longitude',
                    'address',
                    'base_hourly_rate',
                    'status',
                    'approval_status',
                    'amenities',
                    'vehicle_compatibility',
                    'dimensions',
                    'surface_type',
                    'slot_owner' => [
                        'id',
                        'first_name',
                        'last_name',
                    ]
                ]
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $this->parkingSlot->id,
                    'slot_number' => $this->parkingSlot->slot_number,
                ]
            ]);
    }

    public function test_parking_slot_cache_invalidation_on_update(): void
    {
        Sanctum::actingAs($this->slotOwner, ['*']);

        $cacheService = app(CacheService::class);

        // Cache the slot
        $cacheService->cacheParkingSlot($this->parkingSlot);
        $cachedSlot = $cacheService->getCachedParkingSlot($this->parkingSlot->id);
        $this->assertNotNull($cachedSlot);

        // Update the slot
        $updateData = ['base_hourly_rate' => 80.00];
        $response = $this->putJson("/api/parking-slots/{$this->parkingSlot->id}", $updateData);

        $response->assertStatus(200);

        // Cache should be invalidated
        $cachedSlotAfterUpdate = $cacheService->getCachedParkingSlot($this->parkingSlot->id);
        $this->assertNull($cachedSlotAfterUpdate);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $response = $this->getJson('/api/parking-slots/nearby', [
            'latitude' => 14.5995,
            'longitude' => 120.9842,
        ]);

        $response->assertStatus(401);
    }

    public function test_parking_slot_search_with_amenities_filter(): void
    {
        Sanctum::actingAs($this->user, ['*']);

        // Create slot with specific amenities
        ParkingSlot::factory()->create([
            'slot_owner_id' => $this->slotOwner->id,
            'status' => 'available',
            'approval_status' => 'published',
            'is_active' => true,
            'latitude' => 14.5997,
            'longitude' => 120.9844,
            'amenities' => ['covered', 'ev_charging'],
        ]);

        $response = $this->getJson('/api/parking-slots/nearby', [
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'radius' => 1000,
            'amenities' => ['ev_charging'],
        ]);

        $response->assertStatus(200);

        $slots = $response->json('data.slots');
        foreach ($slots as $slot) {
            if (!empty($slot['amenities'])) {
                $this->assertContains('ev_charging', $slot['amenities']);
            }
        }
    }

    public function test_parking_slot_list_for_slot_owner(): void
    {
        Sanctum::actingAs($this->slotOwner, ['*']);

        // Create additional slots for the owner
        ParkingSlot::factory()->count(3)->create([
            'slot_owner_id' => $this->slotOwner->id,
        ]);

        $response = $this->getJson('/api/parking-slots');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'slots' => [
                        '*' => [
                            'id',
                            'slot_number',
                            'status',
                            'approval_status',
                            'base_hourly_rate',
                        ]
                    ],
                    'total',
                ]
            ]);

        $this->assertEquals(4, $response->json('data.total')); // 1 + 3 new slots
    }
}