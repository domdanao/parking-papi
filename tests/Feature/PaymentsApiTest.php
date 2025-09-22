<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Payments API Contract Tests', function () {
    beforeEach(function () {
        $this->user = User::factory()->create(['role' => 'vehicle_owner']);
    });

    describe('POST /api/wallet/top-up', function () {
        it('tops up digital wallet successfully', function () {
            $this->actingAs($this->user, 'sanctum');

            $response = $this->postJson('/api/wallet/top-up', [
                'amount' => 50.00,
                'payment_method_id' => 'pm_123'
            ]);

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'transaction_id',
                        'new_balance',
                        'amount_added'
                    ]
                ]);
        });
    });

    describe('GET /api/payment-methods', function () {
        it('returns user payment methods', function () {
            $this->actingAs($this->user, 'sanctum');

            $response = $this->getJson('/api/payment-methods');

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'data' => [
                        'payment_methods' => [
                            '*' => [
                                'id',
                                'type',
                                'last_four_digits',
                                'is_default'
                            ]
                        ]
                    ]
                ]);
        });
    });
});
