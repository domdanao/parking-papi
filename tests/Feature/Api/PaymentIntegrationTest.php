<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\ParkingSlot;
use App\Models\ParkingSession;
use App\Models\PaymentTransaction;
use App\Models\DigitalWallet;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Mockery;

class PaymentIntegrationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private User $vehicleOwner;
    private User $slotOwner;
    private ParkingSlot $parkingSlot;
    private ParkingSession $parkingSession;
    private DigitalWallet $wallet;

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
            'base_hourly_rate' => 50.00,
        ]);

        $this->parkingSession = ParkingSession::factory()->create([
            'user_id' => $this->vehicleOwner->id,
            'parking_slot_id' => $this->parkingSlot->id,
            'status' => 'pending',
            'start_time' => now(),
            'end_time' => now()->addHours(2),
            'total_amount' => 100.00,
        ]);

        $this->wallet = DigitalWallet::factory()->create([
            'user_id' => $this->vehicleOwner->id,
            'balance' => 500.00,
            'loyalty_points' => 100,
        ]);
    }

    public function test_wallet_balance_retrieval(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $response = $this->getJson('/api/payments/wallet/balance');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'balance',
                    'loyalty_points',
                    'pending_transactions',
                ]
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'balance' => 500.00,
                    'loyalty_points' => 100,
                ]
            ]);
    }

    public function test_wallet_topup_successful(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $response = $this->postJson('/api/payments/wallet/topup', [
            'amount' => 200.00,
            'payment_method' => 'credit_card',
            'payment_details' => [
                'card_token' => 'test_card_token_123',
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'transaction_id',
                    'amount',
                    'new_balance',
                    'status',
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'amount' => 200.00,
                    'new_balance' => 700.00,
                    'status' => 'completed',
                ]
            ]);

        $this->assertDatabaseHas('payment_transactions', [
            'user_id' => $this->vehicleOwner->id,
            'transaction_type' => 'topup',
            'amount' => 200.00,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('digital_wallets', [
            'user_id' => $this->vehicleOwner->id,
            'balance' => 700.00,
        ]);
    }

    public function test_wallet_topup_validation_errors(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Missing amount
        $response = $this->postJson('/api/payments/wallet/topup', [
            'payment_method' => 'credit_card',
            'payment_details' => [
                'card_token' => 'test_card_token_123',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);

        // Invalid amount (too small)
        $response = $this->postJson('/api/payments/wallet/topup', [
            'amount' => 5.00, // Below minimum
            'payment_method' => 'credit_card',
            'payment_details' => [
                'card_token' => 'test_card_token_123',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);

        // Invalid payment method
        $response = $this->postJson('/api/payments/wallet/topup', [
            'amount' => 100.00,
            'payment_method' => 'invalid_method',
            'payment_details' => [
                'card_token' => 'test_card_token_123',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['payment_method']);
    }

    public function test_parking_session_payment_with_wallet(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $response = $this->postJson("/api/payments/sessions/{$this->parkingSession->id}/pay", [
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'transaction_id',
                    'session_id',
                    'amount_paid',
                    'remaining_balance',
                    'loyalty_points_earned',
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'session_id' => $this->parkingSession->id,
                    'amount_paid' => 100.00,
                    'remaining_balance' => 400.00,
                ]
            ]);

        $this->assertDatabaseHas('parking_sessions', [
            'id' => $this->parkingSession->id,
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('payment_transactions', [
            'user_id' => $this->vehicleOwner->id,
            'session_id' => $this->parkingSession->id,
            'amount' => 100.00,
            'transaction_type' => 'parking_payment',
            'status' => 'completed',
        ]);
    }

    public function test_parking_session_payment_insufficient_balance(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Reduce wallet balance below session amount
        $this->wallet->update(['balance' => 50.00]);

        $response = $this->postJson("/api/payments/sessions/{$this->parkingSession->id}/pay", [
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Insufficient wallet balance',
                'data' => [
                    'required_amount' => 100.00,
                    'current_balance' => 50.00,
                    'shortfall' => 50.00,
                ]
            ]);

        $this->assertDatabaseHas('parking_sessions', [
            'id' => $this->parkingSession->id,
            'status' => 'pending', // Status should remain unchanged
        ]);
    }

    public function test_parking_session_payment_with_credit_card(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $response = $this->postJson("/api/payments/sessions/{$this->parkingSession->id}/pay", [
            'payment_method' => 'credit_card',
            'payment_details' => [
                'card_token' => 'test_card_token_456',
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'transaction_id',
                    'session_id',
                    'amount_paid',
                    'payment_gateway_reference',
                    'loyalty_points_earned',
                ],
                'message'
            ]);

        $this->assertDatabaseHas('payment_transactions', [
            'user_id' => $this->vehicleOwner->id,
            'session_id' => $this->parkingSession->id,
            'amount' => 100.00,
            'payment_method' => 'credit_card',
            'status' => 'completed',
        ]);
    }

    public function test_payment_transaction_history(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Create some test transactions
        PaymentTransaction::factory()->count(5)->create([
            'user_id' => $this->vehicleOwner->id,
            'status' => 'completed',
        ]);

        $response = $this->getJson('/api/payments/transactions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'transactions' => [
                        '*' => [
                            'id',
                            'transaction_type',
                            'amount',
                            'status',
                            'created_at',
                            'session_info',
                        ]
                    ],
                    'pagination' => [
                        'current_page',
                        'total',
                        'per_page',
                    ]
                ]
            ]);

        $this->assertCount(5, $response->json('data.transactions'));
    }

    public function test_payment_transaction_history_filtering(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Create transactions of different types
        PaymentTransaction::factory()->create([
            'user_id' => $this->vehicleOwner->id,
            'transaction_type' => 'topup',
            'amount' => 100.00,
            'status' => 'completed',
        ]);

        PaymentTransaction::factory()->create([
            'user_id' => $this->vehicleOwner->id,
            'transaction_type' => 'parking_payment',
            'amount' => 50.00,
            'status' => 'completed',
        ]);

        // Filter by transaction type
        $response = $this->getJson('/api/payments/transactions?type=topup');

        $response->assertStatus(200);
        $transactions = $response->json('data.transactions');

        foreach ($transactions as $transaction) {
            $this->assertEquals('topup', $transaction['transaction_type']);
        }
    }

    public function test_refund_processing(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Create a completed payment transaction
        $transaction = PaymentTransaction::factory()->create([
            'user_id' => $this->vehicleOwner->id,
            'session_id' => $this->parkingSession->id,
            'amount' => 100.00,
            'transaction_type' => 'parking_payment',
            'status' => 'completed',
        ]);

        $this->parkingSession->update(['status' => 'cancelled']);

        $response = $this->postJson("/api/payments/transactions/{$transaction->id}/refund", [
            'reason' => 'Early departure',
            'refund_amount' => 50.00,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'refund_transaction_id',
                    'original_transaction_id',
                    'refund_amount',
                    'status',
                    'processed_at',
                ],
                'message'
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'original_transaction_id' => $transaction->id,
                    'refund_amount' => 50.00,
                    'status' => 'completed',
                ]
            ]);

        $this->assertDatabaseHas('payment_transactions', [
            'transaction_type' => 'refund',
            'amount' => 50.00,
            'status' => 'completed',
            'related_transaction_id' => $transaction->id,
        ]);

        // Check wallet balance increased
        $this->assertDatabaseHas('digital_wallets', [
            'user_id' => $this->vehicleOwner->id,
            'balance' => 550.00, // Original 500 + 50 refund
        ]);
    }

    public function test_refund_unauthorized_access(): void
    {
        $otherUser = User::factory()->create(['role' => 'vehicle_owner']);
        Sanctum::actingAs($otherUser, ['*']);

        $transaction = PaymentTransaction::factory()->create([
            'user_id' => $this->vehicleOwner->id,
            'amount' => 100.00,
            'status' => 'completed',
        ]);

        $response = $this->postJson("/api/payments/transactions/{$transaction->id}/refund", [
            'reason' => 'Unauthorized attempt',
            'refund_amount' => 50.00,
        ]);

        $response->assertStatus(403);
    }

    public function test_loyalty_points_calculation(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Make a payment that should earn loyalty points
        $response = $this->postJson("/api/payments/sessions/{$this->parkingSession->id}/pay", [
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(200);

        $loyaltyPointsEarned = $response->json('data.loyalty_points_earned');
        $expectedPoints = floor(100.00 / 10); // 1 point per 10 currency units

        $this->assertEquals($expectedPoints, $loyaltyPointsEarned);

        $this->assertDatabaseHas('digital_wallets', [
            'user_id' => $this->vehicleOwner->id,
            'loyalty_points' => 100 + $expectedPoints, // Original + earned
        ]);
    }

    public function test_payment_method_management(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Get saved payment methods
        $response = $this->getJson('/api/payments/methods');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'payment_methods' => [
                        '*' => [
                            'id',
                            'type',
                            'display_name',
                            'is_default',
                            'created_at',
                        ]
                    ]
                ]
            ]);
    }

    public function test_add_payment_method(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $response = $this->postJson('/api/payments/methods', [
            'type' => 'credit_card',
            'payment_details' => [
                'card_token' => 'new_card_token_789',
                'last_four' => '1234',
                'brand' => 'visa',
                'expiry_month' => '12',
                'expiry_year' => '2025',
            ],
            'is_default' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'type',
                    'display_name',
                    'is_default',
                ],
                'message'
            ]);

        $this->assertDatabaseHas('payment_methods', [
            'user_id' => $this->vehicleOwner->id,
            'type' => 'credit_card',
            'is_default' => true,
        ]);
    }

    public function test_commission_calculation_for_slot_owner(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        $response = $this->postJson("/api/payments/sessions/{$this->parkingSession->id}/pay", [
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(200);

        // Verify commission calculation in transaction
        $transaction = PaymentTransaction::where('session_id', $this->parkingSession->id)->first();

        $expectedCommission = 100.00 * 0.15; // 15% platform commission
        $expectedNetAmount = 100.00 - $expectedCommission;

        $this->assertEquals($expectedCommission, $transaction->platform_commission);
        $this->assertEquals($expectedNetAmount, $transaction->net_amount_to_slot_owner);
    }

    public function test_unauthenticated_payment_requests_rejected(): void
    {
        $response = $this->getJson('/api/payments/wallet/balance');
        $response->assertStatus(401);

        $response = $this->postJson('/api/payments/wallet/topup', [
            'amount' => 100.00,
            'payment_method' => 'credit_card',
        ]);
        $response->assertStatus(401);

        $response = $this->getJson('/api/payments/transactions');
        $response->assertStatus(401);
    }

    public function test_payment_gateway_failure_handling(): void
    {
        Sanctum::actingAs($this->vehicleOwner, ['*']);

        // Mock payment service to simulate failure
        $this->mock(PaymentService::class, function ($mock) {
            $mock->shouldReceive('processPayment')
                ->andThrow(new \Exception('Payment gateway error'));
        });

        $response = $this->postJson("/api/payments/sessions/{$this->parkingSession->id}/pay", [
            'payment_method' => 'credit_card',
            'payment_details' => [
                'card_token' => 'test_card_token_fail',
            ],
        ]);

        $response->assertStatus(500)
            ->assertJson([
                'success' => false,
                'message' => 'Payment processing failed',
            ]);

        // Verify failed transaction record
        $this->assertDatabaseHas('payment_transactions', [
            'user_id' => $this->vehicleOwner->id,
            'session_id' => $this->parkingSession->id,
            'status' => 'failed',
        ]);
    }
}