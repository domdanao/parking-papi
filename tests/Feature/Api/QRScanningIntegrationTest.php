<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\ParkingSlot;
use App\Models\ParkingSession;
use App\Services\CacheService;
use App\Jobs\ProcessQRScan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QRScanningIntegrationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private User $vehicleOwner;
    private User $slotOwner;
    private ParkingSlot $parkingSlot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vehicleOwner = User::factory()->create([
            'role' => 'vehicle_owner',
            'email_verified_at' => now(),
            'mobile_verified_at' => now(),
        ]);

        $this->slotOwner = User::factory()->create([
            'role' => 'slot_owner',
            'email_verified_at' => now(),
            'mobile_verified_at' => now(),
        ]);

        $this->parkingSlot = ParkingSlot::factory()->create([
            'slot_owner_id' => $this->slotOwner->id,
            'status' => 'available',
            'approval_status' => 'published',
            'is_active' => true,
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'base_hourly_rate' => 50.00,
        ]);
    }

    public function test_qr_scan_initiates_processing_job(): void
    {
        Queue::fake();
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $qrData = "parking://slot/{$this->parkingSlot->id}";

        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => $qrData,
            'location' => [
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ],
        ]);

        $response->assertStatus(202)
            ->assertJson([
                'success' => true,
                'message' => 'QR scan is being processed',
            ]);

        Queue::assertPushed(ProcessQRScan::class, function ($job) use ($qrData) {
            return $job->qrData === $qrData &&
                   $job->userId === $this->vehicleOwner->id;
        });
    }

    public function test_qr_scan_validation_errors(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Missing QR data
        $response = $this->postJson('/api/qr/scan', [
            'location' => [
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['qr_data']);

        // Missing location
        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => "parking://slot/{$this->parkingSlot->id}",
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['location']);

        // Invalid location format
        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => "parking://slot/{$this->parkingSlot->id}",
            'location' => [
                'lat' => 14.5995, // Wrong key name
                'lng' => 120.9842, // Wrong key name
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['location.latitude', 'location.longitude']);
    }

    public function test_qr_scan_status_retrieval(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $scanId = 'scan_test_123';
        $cacheService = app(CacheService::class);

        // Mock cached scan result
        $scanResult = [
            'scan_id' => $scanId,
            'session_token' => 'session_test_token',
            'slot_info' => [
                'id' => $this->parkingSlot->id,
                'slot_number' => $this->parkingSlot->slot_number,
                'hourly_rate' => $this->parkingSlot->base_hourly_rate,
                'status' => 'reserved',
            ],
            'expires_at' => now()->addMinutes(5)->toISOString(),
            'location' => [
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ],
            'user_id' => $this->vehicleOwner->id,
        ];

        $cacheService->cacheWithTags(
            ['qr_scans', 'user:' . $this->vehicleOwner->id],
            'qr_scan:' . $scanId,
            $scanResult,
            300
        );

        $response = $this->getJson("/api/qr/scan-status/{$scanId}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => $scanResult,
            ]);
    }

    public function test_qr_scan_status_not_found(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $response = $this->getJson('/api/qr/scan-status/nonexistent-scan-id');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Scan result not found or expired',
            ]);
    }

    public function test_qr_scan_unauthorized_access_to_other_user_scan(): void
    {
        $otherUser = User::factory()->create(['role' => 'vehicle_owner']);
        Sanctum::actingAs($otherUser, ['*']);

        $scanId = 'scan_test_123';
        $cacheService = app(CacheService::class);

        // Cache scan result for the first user
        $scanResult = [
            'scan_id' => $scanId,
            'user_id' => $this->vehicleOwner->id,
            'slot_info' => [
                'id' => $this->parkingSlot->id,
                'slot_number' => $this->parkingSlot->slot_number,
            ],
        ];

        $cacheService->cacheWithTags(
            ['qr_scans', 'user:' . $this->vehicleOwner->id],
            'qr_scan:' . $scanId,
            $scanResult,
            300
        );

        // Try to access with different user
        $response = $this->getJson("/api/qr/scan-status/{$scanId}");

        $response->assertStatus(404);
    }

    public function test_payment_activation_with_valid_session_token(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $sessionToken = 'session_test_token_123';
        $scanId = 'scan_test_123';

        $cacheService = app(CacheService::class);

        // Mock cached scan result
        $scanResult = [
            'scan_id' => $scanId,
            'session_token' => $sessionToken,
            'slot_info' => [
                'id' => $this->parkingSlot->id,
                'slot_number' => $this->parkingSlot->slot_number,
                'hourly_rate' => $this->parkingSlot->base_hourly_rate,
                'status' => 'reserved',
            ],
            'expires_at' => now()->addMinutes(5)->toISOString(),
            'user_id' => $this->vehicleOwner->id,
        ];

        $cacheService->cacheWithTags(
            ['qr_scans', 'user:' . $this->vehicleOwner->id],
            'qr_scan:' . $scanId,
            $scanResult,
            300
        );

        // Mark slot as reserved
        $this->parkingSlot->update(['status' => 'reserved']);

        $response = $this->postJson('/api/qr/activate-payment', [
            'session_token' => $sessionToken,
            'duration_minutes' => 120,
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'session_id',
                    'confirmation_code',
                    'start_time',
                    'end_time',
                    'total_amount',
                    'parking_slot' => [
                        'id',
                        'slot_number',
                        'address',
                    ],
                ],
                'message'
            ]);

        // Verify session was created in database
        $this->assertDatabaseHas('parking_sessions', [
            'user_id' => $this->vehicleOwner->id,
            'parking_slot_id' => $this->parkingSlot->id,
            'status' => 'active',
        ]);

        // Verify slot status updated to occupied
        $this->assertDatabaseHas('parking_slots', [
            'id' => $this->parkingSlot->id,
            'status' => 'occupied',
        ]);
    }

    public function test_payment_activation_with_invalid_session_token(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $response = $this->postJson('/api/qr/activate-payment', [
            'session_token' => 'invalid_session_token',
            'duration_minutes' => 120,
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid or expired session token',
            ]);
    }

    public function test_payment_activation_validation_errors(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Missing session token
        $response = $this->postJson('/api/qr/activate-payment', [
            'duration_minutes' => 120,
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['session_token']);

        // Invalid duration
        $response = $this->postJson('/api/qr/activate-payment', [
            'session_token' => 'valid_token',
            'duration_minutes' => 0, // Invalid duration
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['duration_minutes']);

        // Invalid payment method
        $response = $this->postJson('/api/qr/activate-payment', [
            'session_token' => 'valid_token',
            'duration_minutes' => 120,
            'payment_method' => 'invalid_method',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['payment_method']);
    }

    public function test_qr_scan_with_occupied_slot(): void
    {
        Queue::fake();
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Set slot to occupied
        $this->parkingSlot->update(['status' => 'occupied']);

        $qrData = "parking://slot/{$this->parkingSlot->id}";

        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => $qrData,
            'location' => [
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ],
        ]);

        // Should still accept the scan request (processing will handle validation)
        $response->assertStatus(202);

        Queue::assertPushed(ProcessQRScan::class);
    }

    public function test_slot_owner_cannot_scan_own_slot(): void
    {
        Sanctum::actingAs($this->slotOwner, ['*']);

        $qrData = "parking://slot/{$this->parkingSlot->id}";

        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => $qrData,
            'location' => [
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ],
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Slot owners cannot scan their own slots',
            ]);
    }

    public function test_unauthenticated_qr_scan_rejected(): void
    {
        $qrData = "parking://slot/{$this->parkingSlot->id}";

        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => $qrData,
            'location' => [
                'latitude' => 14.5995,
                'longitude' => 120.9842,
            ],
        ]);

        $response->assertStatus(401);
    }

    public function test_qr_scan_different_formats(): void
    {
        Queue::fake();
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $location = [
            'latitude' => 14.5995,
            'longitude' => 120.9842,
        ];

        // Test UUID format
        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => $this->parkingSlot->id,
            'location' => $location,
        ]);

        $response->assertStatus(202);

        // Test JSON format
        $jsonQR = json_encode(['slot_id' => $this->parkingSlot->id]);
        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => $jsonQR,
            'location' => $location,
        ]);

        $response->assertStatus(202);

        // Test custom protocol format
        $protocolQR = "parking://slot/{$this->parkingSlot->id}";
        $response = $this->postJson('/api/qr/scan', [
            'qr_data' => $protocolQR,
            'location' => $location,
        ]);

        $response->assertStatus(202);

        Queue::assertPushed(ProcessQRScan::class, 3);
    }

    public function test_session_expiry_handling(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $sessionToken = 'expired_session_token';
        $scanId = 'expired_scan_123';

        $cacheService = app(CacheService::class);

        // Mock expired scan result
        $expiredScanResult = [
            'scan_id' => $scanId,
            'session_token' => $sessionToken,
            'slot_info' => [
                'id' => $this->parkingSlot->id,
            ],
            'expires_at' => now()->subMinutes(1)->toISOString(), // Already expired
            'user_id' => $this->vehicleOwner->id,
        ];

        $cacheService->cacheWithTags(
            ['qr_scans', 'user:' . $this->vehicleOwner->id],
            'qr_scan:' . $scanId,
            $expiredScanResult,
            300
        );

        $response = $this->postJson('/api/qr/activate-payment', [
            'session_token' => $sessionToken,
            'duration_minutes' => 120,
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Session has expired',
            ]);
    }
}