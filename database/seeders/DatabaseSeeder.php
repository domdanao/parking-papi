<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Create test users for each role
        User::firstOrCreate(
            ['email' => 'driver@example.com'],
            [
                'name' => 'Driver User',
                'mobile_number' => '+639123456789',
                'role' => 'vehicle_owner',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ]
        );

        User::firstOrCreate(
            ['email' => 'owner@example.com'],
            [
                'name' => 'Slot Owner',
                'mobile_number' => '+639123456790',
                'role' => 'slot_owner',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ]
        );

        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Platform Admin',
                'mobile_number' => '+639123456791',
                'role' => 'platform_owner',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ]
        );

        User::firstOrCreate(
            ['email' => 'enforcer@example.com'],
            [
                'name' => 'Enforcer User',
                'mobile_number' => '+639123456792',
                'role' => 'enforcer',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ]
        );

        // Call other seeders
        $this->call([
            ParkingSlotSeeder::class,
        ]);
    }
}
