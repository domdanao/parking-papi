<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ParkingSession>
 */
class ParkingSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startTime = fake()->dateTimeBetween('-2 hours', '+1 hour');
        $duration = fake()->randomElement([30, 60, 90, 120, 180, 240]);
        $endTime = (clone $startTime)->modify("+{$duration} minutes");
        $hourlyRate = fake()->randomFloat(2, 25.00, 150.00);

        return [
            'user_id' => \App\Models\User::factory(),
            'parking_slot_id' => \App\Models\ParkingSlot::factory(),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'duration_minutes' => $duration,
            'hourly_rate' => $hourlyRate,
            'total_amount' => round($hourlyRate * ($duration / 60), 2),
            'original_rate' => $hourlyRate,
            'payment_status' => fake()->randomElement(['pending', 'processing', 'completed', 'failed', 'refunded']),
            'payment_method' => fake()->randomElement(['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'wallet', 'card']),
            'status' => fake()->randomElement(['pending', 'active', 'completed', 'cancelled', 'expired']),
            'confirmation_code' => fake()->unique()->bothify('PK-####-????'),
        ];
    }
}
