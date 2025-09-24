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
