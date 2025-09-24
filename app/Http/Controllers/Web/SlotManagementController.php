<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ParkingSlot;
use App\Services\QRCodeService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
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

    public function show(Request $request, string $id): Response
    {
        $slot = ParkingSlot::with(['parkingSessions' => function($query) {
            $query->latest()->limit(10);
        }])->findOrFail($id);

        // Check ownership
        if ($slot->slot_owner_id !== $request->user()->id) {
            abort(403, 'Access denied. You can only view your own slots.');
        }

        // Calculate some basic metrics
        $totalSessions = $slot->parkingSessions()->count();
        $totalRevenue = $slot->parkingSessions()
            ->where('payment_status', 'completed')
            ->sum('total_amount');

        $occupancyRate = 0; // This would need more complex calculation

        return Inertia::render('slots/show', [
            'slot' => $slot,
            'metrics' => [
                'total_sessions' => $totalSessions,
                'total_revenue' => $totalRevenue,
                'occupancy_rate' => $occupancyRate,
            ]
        ]);
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

    public function update(Request $request, string $id)
    {
        $slot = ParkingSlot::findOrFail($id);

        // Check ownership
        if ($slot->slot_owner_id !== $request->user()->id) {
            abort(403, 'Access denied. You can only update your own slots.');
        }

        $validated = $request->validate([
            'slot_number' => 'required|string|max:50',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'address' => 'required|string|max:500',
            'landmark_references' => 'nullable|string|max:1000',
            'dimensions' => 'nullable|array',
            'dimensions.length' => 'nullable|numeric|min:0',
            'dimensions.width' => 'nullable|numeric|min:0',
            'dimensions.height' => 'nullable|numeric|min:0',
            'surface_type' => 'nullable|string|max:50',
            'accessibility_features' => 'nullable|array',
            'vehicle_compatibility' => 'nullable|array',
            'amenities' => 'nullable|array',
            'base_hourly_rate' => 'required|numeric|min:0',
            'minimum_duration_minutes' => 'nullable|integer|min:0',
            'maximum_duration_minutes' => 'nullable|integer|min:0',
            'special_conditions' => 'nullable|string|max:1000',
        ]);

        // Update the slot
        $slot->update([
            'slot_number' => $validated['slot_number'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'address' => $validated['address'],
            'landmark_references' => $validated['landmark_references'] ?? null,
            'dimensions' => $validated['dimensions'] ?? null,
            'surface_type' => $validated['surface_type'] ?? null,
            'accessibility_features' => $validated['accessibility_features'] ?? [],
            'vehicle_compatibility' => $validated['vehicle_compatibility'] ?? [],
            'amenities' => $validated['amenities'] ?? [],
            'base_hourly_rate' => $validated['base_hourly_rate'],
            'minimum_duration_minutes' => $validated['minimum_duration_minutes'] ?? null,
            'maximum_duration_minutes' => $validated['maximum_duration_minutes'] ?? null,
            'special_conditions' => $validated['special_conditions'] ?? null,
            // Reset approval status when slot is updated
            'approval_status' => 'submitted',
        ]);

        return redirect()->route('slots.index')->with('success', 'Parking slot updated successfully!');
    }

    public function downloadQRCode(Request $request, string $id, QRCodeService $qrService): BinaryFileResponse
    {
        $slot = ParkingSlot::findOrFail($id);

        // Check ownership
        if ($slot->slot_owner_id !== $request->user()->id) {
            abort(403, 'Access denied. You can only download QR codes for your own slots.');
        }

        // Generate QR code if it doesn't exist
        $qrCode = $qrService->generateQRCodeForSlot($slot);

        // Get the QR code file path
        $qrImagePath = storage_path('app/public/' . $qrCode->qr_image_path);

        if (!file_exists($qrImagePath)) {
            abort(404, 'QR code file not found.');
        }

        // Return the file as download
        return response()->download($qrImagePath, "slot-{$slot->slot_number}-qr.svg", [
            'Content-Type' => 'image/svg+xml',
        ]);
    }

    public function getQRCode(Request $request, string $id, QRCodeService $qrService): BinaryFileResponse
    {
        $slot = ParkingSlot::findOrFail($id);

        // Check ownership
        if ($slot->slot_owner_id !== $request->user()->id) {
            abort(403, 'Access denied. You can only view QR codes for your own slots.');
        }

        // Generate QR code if it doesn't exist
        $qrCode = $qrService->generateQRCodeForSlot($slot);

        // Get the QR code file path
        $qrImagePath = storage_path('app/public/' . $qrCode->qr_image_path);

        if (!file_exists($qrImagePath)) {
            abort(404, 'QR code file not found.');
        }

        // Return the file for display
        return response()->file($qrImagePath, [
            'Content-Type' => 'image/svg+xml',
        ]);
    }
}
