<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParkingSlot;
use App\Services\CacheService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ParkingSlotController extends Controller
{
    public function __construct(
        private CacheService $cacheService
    ) {}

    public function nearby(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius' => 'sometimes|integer|min:100|max:5000',
            'vehicle_type' => 'sometimes|in:car,motorcycle,truck,van',
            'amenities' => 'sometimes|array',
            'amenities.*' => 'in:covered,secured,ev_charging,disabled_access',
            'max_price' => 'sometimes|numeric|min:0',
            'limit' => 'sometimes|integer|min:1|max:50'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        $latitude = $request->latitude;
        $longitude = $request->longitude;
        $radius = $request->radius ?? 1000;
        $limit = $request->limit ?? 20;

        // Check cache first
        $cachedSlots = $this->cacheService->getCachedNearbySlots($latitude, $longitude, $radius);
        if ($cachedSlots !== null) {
            return response()->json([
                'success' => true,
                'data' => [
                    'slots' => array_slice($cachedSlots, 0, $limit),
                    'from_cache' => true
                ]
            ]);
        }

        // For demo purposes, return a basic structure
        // In production, this would use PostGIS spatial queries
        $slots = ParkingSlot::where('status', 'available')
            ->where('is_active', true)
            ->where('approval_status', 'published')
            ->limit($limit)
            ->get()
            ->map(function ($slot) use ($latitude, $longitude) {
                // Simple distance calculation for demo
                $distance = 500; // Mock distance in meters

                return [
                    'id' => $slot->id,
                    'slot_number' => $slot->slot_number,
                    'latitude' => $slot->latitude,
                    'longitude' => $slot->longitude,
                    'address' => $slot->address,
                    'base_hourly_rate' => $slot->base_hourly_rate,
                    'status' => $slot->status,
                    'amenities' => $slot->amenities,
                    'vehicle_compatibility' => $slot->vehicle_compatibility,
                    'distance_meters' => $distance,
                    'estimated_walk_time_minutes' => ceil($distance / 80), // ~5km/h walking speed
                    'photos' => $slot->photos,
                ];
            });

        // Cache the results
        $slotsArray = $slots->toArray();
        $this->cacheService->cacheNearbySlots($latitude, $longitude, $radius, $slotsArray);

        // Also cache individual slots
        foreach ($slots as $slot) {
            $this->cacheService->cacheParkingSlot($slot);
            $this->cacheService->cacheSlotAvailability($slot->id, $slot->status);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'slots' => $slotsArray,
                'total' => $slots->count(),
                'current_location' => [
                    'latitude' => $latitude,
                    'longitude' => $longitude
                ],
                'search_radius_meters' => $radius
            ]
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Check if user is slot owner
        if ($request->user()->role !== 'slot_owner') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Slot owner role required.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'slot_number' => 'required|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'address' => 'required|string',
            'dimensions' => 'sometimes|array',
            'surface_type' => 'sometimes|in:asphalt,concrete,gravel,paved,unpaved',
            'vehicle_compatibility' => 'sometimes|array',
            'base_hourly_rate' => 'required|numeric|min:0',
            'minimum_duration_minutes' => 'sometimes|integer|min:15',
            'maximum_duration_minutes' => 'sometimes|integer|min:60',
            'amenities' => 'sometimes|array',
            'special_conditions' => 'sometimes|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        $slot = ParkingSlot::create([
            'slot_owner_id' => $request->user()->id,
            'slot_number' => $request->slot_number,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'address' => $request->address,
            'dimensions' => $request->dimensions,
            'surface_type' => $request->surface_type ?? 'asphalt',
            'vehicle_compatibility' => $request->vehicle_compatibility ?? ['car'],
            'base_hourly_rate' => $request->base_hourly_rate,
            'minimum_duration_minutes' => $request->minimum_duration_minutes ?? 30,
            'maximum_duration_minutes' => $request->maximum_duration_minutes ?? 480,
            'amenities' => $request->amenities,
            'special_conditions' => $request->special_conditions,
            'status' => 'available',
            'approval_status' => 'submitted',
            'is_active' => false, // Activated after approval
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Parking slot created successfully',
            'data' => [
                'slot' => [
                    'id' => $slot->id,
                    'slot_number' => $slot->slot_number,
                    'latitude' => $slot->latitude,
                    'longitude' => $slot->longitude,
                    'status' => $slot->status,
                    'approval_status' => $slot->approval_status,
                    'base_hourly_rate' => $slot->base_hourly_rate,
                    'created_at' => $slot->created_at,
                    'updated_at' => $slot->updated_at,
                ]
            ]
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $slot = ParkingSlot::with('slotOwner')->find($id);

        if (!$slot) {
            return response()->json([
                'success' => false,
                'message' => 'Parking slot not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'slot' => [
                    'id' => $slot->id,
                    'slot_number' => $slot->slot_number,
                    'latitude' => $slot->latitude,
                    'longitude' => $slot->longitude,
                    'address' => $slot->address,
                    'dimensions' => $slot->dimensions,
                    'surface_type' => $slot->surface_type,
                    'vehicle_compatibility' => $slot->vehicle_compatibility,
                    'base_hourly_rate' => $slot->base_hourly_rate,
                    'pricing_variations' => $slot->pricing_variations,
                    'amenities' => $slot->amenities,
                    'restrictions' => $slot->restrictions,
                    'status' => $slot->status,
                    'photos' => $slot->photos,
                    'owner' => [
                        'id' => $slot->slotOwner->id,
                        'first_name' => $slot->slotOwner->first_name,
                        'rating' => 4.5 // Mock rating
                    ]
                ]
            ]
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $slot = ParkingSlot::find($id);

        if (!$slot) {
            return response()->json([
                'success' => false,
                'message' => 'Parking slot not found'
            ], 404);
        }

        // Check ownership
        if ($slot->slot_owner_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. You can only update your own slots.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'base_hourly_rate' => 'sometimes|numeric|min:0',
            'amenities' => 'sometimes|array',
            'special_conditions' => 'sometimes|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        $slot->update($request->only([
            'base_hourly_rate',
            'amenities',
            'special_conditions'
        ]));

        return response()->json([
            'success' => true,
            'data' => [
                'slot' => [
                    'id' => $slot->id,
                    'base_hourly_rate' => $slot->base_hourly_rate,
                    'amenities' => $slot->amenities,
                    'special_conditions' => $slot->special_conditions,
                ]
            ]
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $slot = ParkingSlot::find($id);

        if (!$slot) {
            return response()->json([
                'success' => false,
                'message' => 'Parking slot not found'
            ], 404);
        }

        // Check ownership
        if ($slot->slot_owner_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. You can only delete your own slots.'
            ], 403);
        }

        $slot->delete();

        return response()->json([
            'success' => true,
            'message' => 'Parking slot deleted successfully'
        ]);
    }

    public function availability(Request $request, string $id): JsonResponse
    {
        $slot = ParkingSlot::find($id);

        if (!$slot) {
            return response()->json([
                'success' => false,
                'message' => 'Parking slot not found'
            ], 404);
        }

        // Mock availability data
        $availability = [
            [
                'date' => '2025-09-23',
                'available_hours' => [
                    ['hour' => 9, 'available' => true, 'price' => $slot->base_hourly_rate],
                    ['hour' => 10, 'available' => true, 'price' => $slot->base_hourly_rate],
                    ['hour' => 11, 'available' => false, 'price' => null],
                ]
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'slot_id' => $slot->id,
                'availability' => $availability
            ]
        ]);
    }
}