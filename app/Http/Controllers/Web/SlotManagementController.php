<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ParkingSlot;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SlotManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Only slot owners can access this
        if ($user->role !== 'slot_owner') {
            abort(403, 'Access denied. Slot owner role required.');
        }

        $slots = ParkingSlot::where('slot_owner_id', $user->id)
            ->latest()
            ->get();

        return Inertia::render('slots/index', [
            'slots' => $slots
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('slots/create');
    }

    public function edit(Request $request, string $id): Response
    {
        $slot = ParkingSlot::findOrFail($id);

        // Check ownership
        if ($slot->slot_owner_id !== $request->user()->id) {
            abort(403, 'Access denied. You can only edit your own slots.');
        }

        return Inertia::render('slots/edit', [
            'slot' => $slot
        ]);
    }
}
