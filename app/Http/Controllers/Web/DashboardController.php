<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ParkingSlot;
use App\Models\ParkingSession;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Role-based dashboard data
        $dashboardData = match ($user->role) {
            'vehicle_owner' => $this->getVehicleOwnerDashboard($user),
            'slot_owner' => $this->getSlotOwnerDashboard($user),
            'platform_owner' => $this->getPlatformOwnerDashboard(),
            'enforcer' => $this->getEnforcerDashboard(),
            default => []
        };

        return Inertia::render('dashboard', [
            'user' => $user,
            'dashboardData' => $dashboardData
        ]);
    }

    private function getVehicleOwnerDashboard($user): array
    {
        $activeSessions = ParkingSession::where('user_id', $user->id)
            ->where('status', 'active')
            ->with('parkingSlot')
            ->get();

        $recentSessions = ParkingSession::where('user_id', $user->id)
            ->where('status', 'completed')
            ->with('parkingSlot')
            ->latest()
            ->limit(5)
            ->get();

        return [
            'type' => 'vehicle_owner',
            'stats' => [
                'active_sessions' => $activeSessions->count(),
                'total_spent_this_month' => $recentSessions->sum('total_amount'),
                'sessions_this_month' => $recentSessions->count(),
                'favorite_locations' => 3
            ],
            'active_sessions' => $activeSessions,
            'recent_sessions' => $recentSessions
        ];
    }

    private function getSlotOwnerDashboard($user): array
    {
        $slots = ParkingSlot::where('slot_owner_id', $user->id)->get();
        $sessions = ParkingSession::whereIn('parking_slot_id', $slots->pluck('id'))
            ->where('created_at', '>=', now()->startOfMonth())
            ->get();

        return [
            'type' => 'slot_owner',
            'stats' => [
                'total_slots' => $slots->count(),
                'active_slots' => $slots->where('status', 'available')->count(),
                'revenue_this_month' => $sessions->sum('total_amount'),
                'occupancy_rate' => $sessions->count() > 0 ? 0.75 : 0
            ],
            'slots' => $slots->take(5),
            'recent_sessions' => $sessions->take(5)
        ];
    }

    private function getPlatformOwnerDashboard(): array
    {
        $totalSlots = ParkingSlot::count();
        $activeSessions = ParkingSession::where('status', 'active')->count();
        $dailyRevenue = ParkingSession::whereDate('created_at', today())->sum('total_amount');

        return [
            'type' => 'platform_owner',
            'stats' => [
                'total_slots' => $totalSlots,
                'active_sessions' => $activeSessions,
                'daily_revenue' => $dailyRevenue,
                'total_users' => \App\Models\User::count()
            ],
            'alerts' => [
                [
                    'type' => 'high_demand',
                    'message' => 'Downtown area experiencing 95% occupancy',
                    'severity' => 'warning'
                ]
            ]
        ];
    }

    private function getEnforcerDashboard(): array
    {
        return [
            'type' => 'enforcer',
            'stats' => [
                'violations_today' => 0,
                'active_sessions_to_check' => ParkingSession::where('status', 'active')->count(),
                'expired_sessions' => 0
            ]
        ];
    }
}
