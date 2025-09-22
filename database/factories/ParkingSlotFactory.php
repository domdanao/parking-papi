<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ParkingSlot>
 */
class ParkingSlotFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slot_owner_id' => \App\Models\User::factory(),
            'slot_number' => fake()->unique()->bothify('??-###'),
            'latitude' => fake()->latitude(40.0, 41.0),
            'longitude' => fake()->longitude(-75.0, -73.0),
            'address' => fake()->streetAddress() . ', ' . fake()->city() . ', NY',
            'landmark_references' => fake()->sentence(),
            'dimensions' => [
                'length' => fake()->numberBetween(5, 8),
                'width' => fake()->numberBetween(2, 3),
                'height' => fake()->numberBetween(2, 4)
            ],
            'surface_type' => fake()->randomElement(['asphalt', 'concrete', 'gravel', 'paved', 'unpaved']),
            'accessibility_features' => fake()->randomElements(['wheelchair_accessible', 'wide_space', 'curb_cut'], fake()->numberBetween(0, 2)),
            'vehicle_compatibility' => fake()->randomElements(['car', 'motorcycle', 'truck', 'van'], fake()->numberBetween(1, 3)),
            'base_hourly_rate' => fake()->randomFloat(2, 5.00, 25.00),
            'pricing_variations' => [
                'peak_hours' => fake()->randomFloat(2, 1.2, 1.8),
                'off_peak_hours' => fake()->randomFloat(2, 0.8, 1.0)
            ],
            'minimum_duration_minutes' => fake()->randomElement([15, 30, 60]),
            'maximum_duration_minutes' => fake()->randomElement([240, 480, 720]),
            'status' => fake()->randomElement(['available', 'occupied', 'reserved', 'maintenance']),
            'approval_status' => 'published',
            'is_active' => true,
            'amenities' => fake()->randomElements(['covered', 'secured', 'ev_charging', 'disabled_access'], fake()->numberBetween(0, 3)),
            'restrictions' => fake()->randomElements(['no_overnight', 'weekdays_only', 'max_2_hours'], fake()->numberBetween(0, 2)),
            'special_conditions' => fake()->optional()->sentence(),
            'qr_code_hash' => fake()->sha256(),
            'photos' => fake()->randomElements([
                'https://example.com/photo1.jpg',
                'https://example.com/photo2.jpg',
                'https://example.com/photo3.jpg'
            ], fake()->numberBetween(0, 3)),
            'version' => 1,
        ];
    }
}
