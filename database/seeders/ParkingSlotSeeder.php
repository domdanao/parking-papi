<?php

namespace Database\Seeders;

use App\Models\ParkingSlot;
use App\Models\User;
use Illuminate\Database\Seeder;

class ParkingSlotSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $slotOwner = User::where('email', 'owner@example.com')->first();

        if (!$slotOwner) {
            return;
        }

        // Create sample parking slots in Metro Manila
        $slots = [
            [
                'name' => 'Makati CBD Parking',
                'description' => 'Covered parking spot in Makati Central Business District',
                'latitude' => 14.5547,
                'longitude' => 121.0244,
                'base_hourly_rate' => 50.00,
                'status' => 'available',
                'approval_status' => 'approved',
            ],
            [
                'name' => 'BGC High Street Parking',
                'description' => 'Premium parking spot near BGC High Street',
                'latitude' => 14.5515,
                'longitude' => 121.0512,
                'base_hourly_rate' => 75.00,
                'status' => 'available',
                'approval_status' => 'approved',
            ],
            [
                'name' => 'Ortigas Center Parking',
                'description' => 'Secure parking in Ortigas business district',
                'latitude' => 14.5864,
                'longitude' => 121.0644,
                'base_hourly_rate' => 40.00,
                'status' => 'available',
                'approval_status' => 'approved',
            ],
            [
                'name' => 'Quezon City Circle Parking',
                'description' => 'Convenient parking near QC Circle',
                'latitude' => 14.6507,
                'longitude' => 121.0485,
                'base_hourly_rate' => 30.00,
                'status' => 'available',
                'approval_status' => 'approved',
            ],
        ];

        foreach ($slots as $index => $slotData) {
            $slot = ParkingSlot::create([
                'slot_owner_id' => $slotOwner->id,
                'slot_number' => 'SLOT-' . str_pad($index + 1, 3, '0', STR_PAD_LEFT),
                'latitude' => $slotData['latitude'],
                'longitude' => $slotData['longitude'],
                'address' => $slotData['description'],
                'dimensions' => ['length_meters' => 2.5, 'width_meters' => 5.0, 'height_clearance_meters' => 2.1],
                'surface_type' => 'concrete',
                'vehicle_compatibility' => ['car'],
                'base_hourly_rate' => $slotData['base_hourly_rate'],
                'status' => $slotData['status'],
                'approval_status' => $slotData['approval_status'],
                'is_active' => true,
                'amenities' => ['covered'],
            ]);
        }
    }
}
