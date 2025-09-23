<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ParkingSlot;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ParkingController extends Controller
{
    public function search(Request $request): Response
    {
        // For demonstration, return some mock data
        // In production, this would integrate with geolocation and filtering
        $slots = ParkingSlot::where('status', 'available')
            ->where('is_active', true)
            ->where('approval_status', 'published')
            ->with('slotOwner')
            ->limit(20)
            ->get();

        return Inertia::render('parking/search', [
            'slots' => $slots,
            'filters' => [
                'vehicle_types' => ['car', 'motorcycle', 'truck', 'van'],
                'amenities' => ['covered', 'secured', 'ev_charging', 'disabled_access'],
                'price_ranges' => [
                    ['label' => '$0 - $10', 'min' => 0, 'max' => 10],
                    ['label' => '$10 - $20', 'min' => 10, 'max' => 20],
                    ['label' => '$20 - $50', 'min' => 20, 'max' => 50],
                ]
            ]
        ]);
    }

    public function show(Request $request, string $id): Response
    {
        $slot = ParkingSlot::with('slotOwner')->findOrFail($id);

        return Inertia::render('parking/show', [
            'slot' => $slot
        ]);
    }
}
