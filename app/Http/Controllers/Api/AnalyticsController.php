<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class AnalyticsController extends Controller
{
    public function slotPerformance(Request $request): JsonResponse
    {
        // Check if user is slot owner
        if ($request->user()->role !== 'slot_owner') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Slot owner role required.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'period' => 'sometimes|in:day,week,month,quarter,year'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        // For demo purposes, return mock analytics data
        // In production, this would query actual metrics from database

        $metrics = [
            [
                'slot_id' => '550e8400-e29b-41d4-a716-446655440000',
                'total_revenue' => 2450.75,
                'occupancy_rate' => 0.68,
                'total_sessions' => 142,
                'average_session_duration' => 135
            ]
        ];

        $summary = [
            'total_revenue' => 2450.75,
            'average_occupancy_rate' => 0.68
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'metrics' => $metrics,
                'summary' => $summary
            ]
        ]);
    }

    public function platformHealth(Request $request): JsonResponse
    {
        // Check if user is platform owner
        if ($request->user()->role !== 'platform_owner') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Platform owner role required.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'period' => 'sometimes|in:today,week,month'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        // For demo purposes, return mock platform health data
        // In production, this would query real-time platform metrics

        $kpis = [
            'total_active_sessions' => 1247,
            'total_revenue_today' => 18542.30,
            'active_parking_slots' => 3892,
            'registered_users' => 15678
        ];

        $alerts = [
            [
                'type' => 'high_demand',
                'message' => 'Downtown area experiencing 95% occupancy',
                'severity' => 'warning'
            ],
            [
                'type' => 'payment_failure',
                'message' => 'Payment gateway experiencing delays',
                'severity' => 'critical'
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => $kpis,
                'alerts' => $alerts
            ]
        ]);
    }
}
