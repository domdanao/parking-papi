<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Authentication API Contract Tests', function () {
    describe('POST /api/auth/register', function () {
        it('registers a new vehicle owner successfully', function () {
            $response = $this->postJson('/api/auth/register', [
                'mobile_number' => '+1234567890',
                'email' => 'john@example.com',
                'first_name' => 'John',
                'last_name' => 'Doe',
                'password' => 'SecurePassword123!',
                'password_confirmation' => 'SecurePassword123!',
                'role' => 'vehicle_owner',
                'device_name' => 'iPhone 15'
            ]);

            $response->assertStatus(201)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'user' => [
                            'id',
                            'email',
                            'mobile_number',
                            'first_name',
                            'last_name',
                            'role',
                            'account_type',
                            'email_verified_at',
                            'mobile_verified_at',
                            'created_at',
                            'updated_at'
                        ],
                        'token',
                        'expires_at',
                        'otp_required'
                    ]
                ])
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'user' => [
                            'email' => 'john@example.com',
                            'mobile_number' => '+1234567890',
                            'role' => 'vehicle_owner',
                            'account_type' => 'registered'
                        ],
                        'otp_required' => true
                    ]
                ]);
        });

        it('registers a new slot owner successfully', function () {
            $response = $this->postJson('/api/auth/register', [
                'mobile_number' => '+1987654321',
                'email' => 'jane@example.com',
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'password' => 'SecurePassword123!',
                'password_confirmation' => 'SecurePassword123!',
                'role' => 'slot_owner',
                'device_name' => 'Android Phone'
            ]);

            $response->assertStatus(201)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'user' => [
                            'role' => 'slot_owner'
                        ]
                    ]
                ]);
        });

        it('validates required fields', function () {
            $response = $this->postJson('/api/auth/register', []);

            $response->assertStatus(422)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'errors' => [
                        'mobile_number',
                        'password',
                        'role',
                        'device_name'
                    ]
                ])
                ->assertJson([
                    'success' => false
                ]);
        });

        it('validates mobile number format', function () {
            $response = $this->postJson('/api/auth/register', [
                'mobile_number' => 'invalid-phone',
                'password' => 'SecurePassword123!',
                'password_confirmation' => 'SecurePassword123!',
                'role' => 'vehicle_owner',
                'device_name' => 'iPhone 15'
            ]);

            $response->assertStatus(422)
                ->assertJsonPath('errors.mobile_number', fn ($errors) => !empty($errors));
        });

        it('validates password confirmation', function () {
            $response = $this->postJson('/api/auth/register', [
                'mobile_number' => '+1234567890',
                'password' => 'SecurePassword123!',
                'password_confirmation' => 'DifferentPassword',
                'role' => 'vehicle_owner',
                'device_name' => 'iPhone 15'
            ]);

            $response->assertStatus(422)
                ->assertJsonPath('errors.password', fn ($errors) => !empty($errors));
        });
    });

    describe('POST /api/auth/login', function () {
        beforeEach(function () {
            $this->user = User::factory()->create([
                'email' => 'user@example.com',
                'mobile_number' => '+1234567890',
                'password' => bcrypt('SecurePassword123!'),
                'mobile_verified_at' => now(),
                'role' => 'vehicle_owner'
            ]);
        });

        it('logs in with email successfully', function () {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'user@example.com',
                'password' => 'SecurePassword123!',
                'device_name' => 'iPhone 15'
            ]);

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'user' => [
                            'id',
                            'email',
                            'role'
                        ],
                        'token',
                        'expires_at'
                    ]
                ])
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'user' => [
                            'email' => 'user@example.com'
                        ]
                    ]
                ]);
        });

        it('logs in with mobile number successfully', function () {
            $response = $this->postJson('/api/auth/login', [
                'mobile_number' => '+1234567890',
                'password' => 'SecurePassword123!',
                'device_name' => 'iPhone 15'
            ]);

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true
                ]);
        });

        it('rejects invalid credentials', function () {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'user@example.com',
                'password' => 'WrongPassword',
                'device_name' => 'iPhone 15'
            ]);

            $response->assertStatus(401)
                ->assertJsonStructure([
                    'success',
                    'message'
                ])
                ->assertJson([
                    'success' => false
                ]);
        });
    });

    describe('POST /api/auth/verify-otp', function () {
        beforeEach(function () {
            $this->user = User::factory()->create([
                'mobile_number' => '+1234567890',
                'mobile_verified_at' => null
            ]);
        });

        it('verifies OTP successfully', function () {
            $this->actingAs($this->user, 'sanctum');

            $response = $this->postJson('/api/auth/verify-otp', [
                'mobile_number' => '+1234567890',
                'otp_code' => '123456'
            ]);

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'user',
                        'mobile_verified'
                    ]
                ])
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'mobile_verified' => true
                    ]
                ]);
        });

        it('rejects invalid OTP', function () {
            $this->actingAs($this->user, 'sanctum');

            $response = $this->postJson('/api/auth/verify-otp', [
                'mobile_number' => '+1234567890',
                'otp_code' => 'invalid'
            ]);

            $response->assertStatus(422);
        });
    });

    describe('POST /api/auth/logout', function () {
        it('logs out authenticated user', function () {
            $user = User::factory()->create();
            $token = $user->createToken('test-device')->plainTextToken;

            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson('/api/auth/logout');

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Logged out successfully'
                ]);
        });

        it('requires authentication', function () {
            $response = $this->postJson('/api/auth/logout');

            $response->assertStatus(401);
        });
    });

    describe('GET /api/auth/user', function () {
        it('returns authenticated user information', function () {
            $user = User::factory()->create([
                'role' => 'vehicle_owner'
            ]);

            $this->actingAs($user, 'sanctum');

            $response = $this->getJson('/api/auth/user');

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'id',
                        'email',
                        'mobile_number',
                        'role',
                        'created_at'
                    ]
                ])
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'id' => $user->id,
                        'role' => 'vehicle_owner'
                    ]
                ]);
        });

        it('requires authentication', function () {
            $response = $this->getJson('/api/auth/user');

            $response->assertStatus(401);
        });
    });

    describe('POST /api/auth/forgot-password', function () {
        it('sends password reset email', function () {
            $user = User::factory()->create([
                'email' => 'user@example.com'
            ]);

            $response = $this->postJson('/api/auth/forgot-password', [
                'email' => 'user@example.com'
            ]);

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'message' => 'Password reset link sent to your email'
                ]);
        });

        it('validates email field', function () {
            $response = $this->postJson('/api/auth/forgot-password', []);

            $response->assertStatus(422)
                ->assertJsonPath('errors.email', fn ($errors) => !empty($errors));
        });
    });
});