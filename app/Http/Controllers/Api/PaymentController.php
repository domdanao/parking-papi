<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function topUp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:10|max:500',
            'payment_method_id' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        // For demo purposes, simulate wallet top-up
        // In production, this would integrate with Magpie payment gateway
        $transactionId = Str::uuid();
        $currentBalance = 125.50; // Mock current balance
        $newBalance = $currentBalance + $request->amount;

        return response()->json([
            'success' => true,
            'data' => [
                'transaction_id' => $transactionId,
                'new_balance' => $newBalance,
                'amount_added' => $request->amount
            ]
        ]);
    }

    public function getPaymentMethods(Request $request): JsonResponse
    {
        // For demo purposes, return mock payment methods
        // In production, this would retrieve user's saved payment methods

        $paymentMethods = [
            [
                'id' => 'pm_123',
                'type' => 'credit_card',
                'last_four_digits' => '4242',
                'is_default' => true
            ],
            [
                'id' => 'pm_456',
                'type' => 'bank_account',
                'last_four_digits' => '7890',
                'is_default' => false
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'payment_methods' => $paymentMethods
            ]
        ]);
    }
}
