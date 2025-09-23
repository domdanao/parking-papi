<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\DigitalWallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthenticationIntegrationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    public function test_user_registration_successful(): void
    {
        $userData = [
            'first_name' => $this->faker->firstName,
            'last_name' => $this->faker->lastName,
            'email' => $this->faker->unique()->safeEmail,
            'mobile_number' => '+639171234567',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
            'role' => 'vehicle_owner',
        ];

        $response = $this->postJson('/api/auth/register', $userData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'user' => [
                        'id',
                        'first_name',
                        'last_name',
                        'email',
                        'mobile_number',
                        'role',
                        'created_at',
                    ],
                    'requires_verification' => [
                        'email',
                        'mobile',
                    ]
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => $userData['email'],
                        'role' => 'vehicle_owner',
                    ],
                    'requires_verification' => [
                        'email' => true,
                        'mobile' => true,
                    ]
                ]
            ]);

        $this->assertDatabaseHas('users', [
            'email' => $userData['email'],
            'role' => 'vehicle_owner',
            'email_verified_at' => null,
            'mobile_verified_at' => null,
        ]);

        // Verify digital wallet created for vehicle_owner
        $user = User::where('email', $userData['email'])->first();
        $this->assertDatabaseHas('digital_wallets', [
            'user_id' => $user->id,
            'balance' => 0.00,
            'loyalty_points' => 0,
        ]);
    }

    public function test_user_registration_validation_errors(): void
    {
        // Missing required fields
        $response = $this->postJson('/api/auth/register', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'first_name',
                'last_name',
                'email',
                'mobile_number',
                'password',
                'role'
            ]);

        // Invalid email format
        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'invalid-email',
            'mobile_number' => '+639171234567',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
            'role' => 'vehicle_owner',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        // Invalid mobile number format
        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'mobile_number' => '123456', // Invalid format
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
            'role' => 'vehicle_owner',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['mobile_number']);

        // Password confirmation mismatch
        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'mobile_number' => '+639171234567',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'DifferentPassword123!',
            'role' => 'vehicle_owner',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        // Invalid role
        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'mobile_number' => '+639171234567',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
            'role' => 'invalid_role',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_duplicate_email_registration_rejected(): void
    {
        $existingUser = User::factory()->create([
            'email' => 'existing@example.com',
        ]);

        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'existing@example.com',
            'mobile_number' => '+639171234567',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
            'role' => 'vehicle_owner',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_login_successful(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('SecurePassword123!'),
            'email_verified_at' => now(),
            'mobile_verified_at' => now(),
            'role' => 'vehicle_owner',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'SecurePassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'user' => [
                        'id',
                        'first_name',
                        'last_name',
                        'email',
                        'role',
                        'email_verified_at',
                        'mobile_verified_at',
                    ],
                    'token',
                    'expires_at',
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'test@example.com',
                        'role' => 'vehicle_owner',
                    ]
                ]
            ]);

        $this->assertNotNull($response->json('data.token'));
    }

    public function test_user_login_invalid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('CorrectPassword'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid credentials',
            ]);
    }

    public function test_user_login_unverified_account(): void
    {
        $user = User::factory()->create([
            'email' => 'unverified@example.com',
            'password' => Hash::make('SecurePassword123!'),
            'email_verified_at' => null,
            'mobile_verified_at' => null,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'unverified@example.com',
            'password' => 'SecurePassword123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Account requires verification',
                'data' => [
                    'requires_verification' => [
                        'email' => true,
                        'mobile' => true,
                    ]
                ]
            ]);
    }

    public function test_email_verification_otp_send(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'email_verified_at' => null,
        ]);

        $response = $this->postJson('/api/auth/send-email-verification', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Verification code sent to your email',
                'data' => [
                    'expires_in_minutes' => 10,
                ]
            ]);

        // Verify OTP is cached
        $this->assertTrue(Cache::has("email_otp:{$user->id}"));
    }

    public function test_email_verification_otp_verify(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'email_verified_at' => null,
        ]);

        // Set up OTP in cache
        $otp = '123456';
        Cache::put("email_otp:{$user->id}", $otp, 600);

        $response = $this->postJson('/api/auth/verify-email', [
            'email' => 'test@example.com',
            'otp' => $otp,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Email verified successfully',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email_verified_at' => $user->fresh()->email_verified_at,
        ]);

        // Verify OTP is removed from cache
        $this->assertFalse(Cache::has("email_otp:{$user->id}"));
    }

    public function test_email_verification_invalid_otp(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'email_verified_at' => null,
        ]);

        // Set up different OTP in cache
        Cache::put("email_otp:{$user->id}", '123456', 600);

        $response = $this->postJson('/api/auth/verify-email', [
            'email' => 'test@example.com',
            'otp' => '654321', // Wrong OTP
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid or expired verification code',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email_verified_at' => null,
        ]);
    }

    public function test_mobile_verification_otp_send(): void
    {
        $user = User::factory()->create([
            'mobile_number' => '+639171234567',
            'mobile_verified_at' => null,
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/auth/send-mobile-verification');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Verification code sent to your mobile number',
                'data' => [
                    'mobile_number_masked' => '+6391712****7',
                    'expires_in_minutes' => 10,
                ]
            ]);

        $this->assertTrue(Cache::has("mobile_otp:{$user->id}"));
    }

    public function test_mobile_verification_otp_verify(): void
    {
        $user = User::factory()->create([
            'mobile_number' => '+639171234567',
            'mobile_verified_at' => null,
        ]);

        Sanctum::actingAs($user, ['*']);

        $otp = '654321';
        Cache::put("mobile_otp:{$user->id}", $otp, 600);

        $response = $this->postJson('/api/auth/verify-mobile', [
            'otp' => $otp,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Mobile number verified successfully',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'mobile_verified_at' => $user->fresh()->mobile_verified_at,
        ]);
    }

    public function test_user_logout(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('auth-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Successfully logged out',
            ]);

        // Verify token is revoked
        $this->assertEquals(0, $user->tokens()->count());
    }

    public function test_user_profile_retrieval(): void
    {
        $user = User::factory()->create([
            'role' => 'vehicle_owner',
            'email_verified_at' => now(),
            'mobile_verified_at' => now(),
        ]);

        // Create digital wallet for the user
        DigitalWallet::factory()->create([
            'user_id' => $user->id,
            'balance' => 250.50,
            'loyalty_points' => 150,
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/auth/profile');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'user' => [
                        'id',
                        'first_name',
                        'last_name',
                        'email',
                        'mobile_number',
                        'role',
                        'email_verified_at',
                        'mobile_verified_at',
                        'profile_picture',
                        'created_at',
                    ],
                    'wallet' => [
                        'balance',
                        'loyalty_points',
                    ],
                    'verification_status' => [
                        'email_verified',
                        'mobile_verified',
                        'profile_complete',
                    ]
                ]
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'role' => 'vehicle_owner',
                    ],
                    'wallet' => [
                        'balance' => 250.50,
                        'loyalty_points' => 150,
                    ],
                    'verification_status' => [
                        'email_verified' => true,
                        'mobile_verified' => true,
                        'profile_complete' => true,
                    ]
                ]
            ]);
    }

    public function test_user_profile_update(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $updateData = [
            'first_name' => 'UpdatedFirst',
            'last_name' => 'UpdatedLast',
        ];

        $response = $this->putJson('/api/auth/profile', $updateData);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'first_name' => 'UpdatedFirst',
                        'last_name' => 'UpdatedLast',
                    ]
                ],
                'message' => 'Profile updated successfully',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'first_name' => 'UpdatedFirst',
            'last_name' => 'UpdatedLast',
        ]);
    }

    public function test_password_change(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword123!'),
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/auth/change-password', [
            'current_password' => 'OldPassword123!',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Password changed successfully',
            ]);

        // Verify new password works
        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
    }

    public function test_password_change_invalid_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('CorrectPassword'),
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/auth/change-password', [
            'current_password' => 'WrongPassword',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);
    }

    public function test_role_based_access_control(): void
    {
        $vehicleOwner = User::factory()->create(['role' => 'vehicle_owner']);
        $slotOwner = User::factory()->create(['role' => 'slot_owner']);
        $platformOwner = User::factory()->create(['role' => 'platform_owner']);

        // Vehicle owner trying to access slot owner endpoint
        Sanctum::actingAs($vehicleOwner, ['*']);
        $response = $this->getJson('/api/analytics/slot-performance');
        $response->assertStatus(403);

        // Slot owner accessing their allowed endpoint
        Sanctum::actingAs($slotOwner, ['*']);
        $response = $this->getJson('/api/analytics/slot-performance');
        $response->assertStatus(200);

        // Platform owner accessing restricted endpoint
        Sanctum::actingAs($platformOwner, ['*']);
        $response = $this->getJson('/api/analytics/platform-health');
        $response->assertStatus(200);

        // Non-platform owner trying to access platform endpoint
        Sanctum::actingAs($slotOwner, ['*']);
        $response = $this->getJson('/api/analytics/platform-health');
        $response->assertStatus(403);
    }

    public function test_token_refresh(): void
    {
        $user = User::factory()->create();
        $oldToken = $user->createToken('auth-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $oldToken,
        ])->postJson('/api/auth/refresh-token');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'token',
                    'expires_at',
                ],
                'message'
            ]);

        $newToken = $response->json('data.token');
        $this->assertNotEquals($oldToken, $newToken);

        // Verify old token is revoked
        $this->assertEquals(1, $user->tokens()->count());
    }

    public function test_account_deactivation(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/auth/deactivate-account', [
            'reason' => 'No longer needed',
            'password' => 'password', // Default factory password
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Account deactivated successfully',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'is_active' => false,
        ]);

        // Verify all tokens are revoked
        $this->assertEquals(0, $user->tokens()->count());
    }

    public function test_unauthenticated_requests_rejected(): void
    {
        $response = $this->getJson('/api/auth/profile');
        $response->assertStatus(401);

        $response = $this->putJson('/api/auth/profile', ['first_name' => 'Test']);
        $response->assertStatus(401);

        $response = $this->postJson('/api/auth/logout');
        $response->assertStatus(401);

        $response = $this->postJson('/api/auth/change-password', [
            'current_password' => 'old',
            'password' => 'new',
            'password_confirmation' => 'new',
        ]);
        $response->assertStatus(401);
    }
}