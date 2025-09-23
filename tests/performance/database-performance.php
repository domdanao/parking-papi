<?php

namespace Tests\Performance;

use App\Models\User;
use App\Models\ParkingSlot;
use App\Models\ParkingSession;
use App\Models\PaymentTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DatabasePerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected $testDataSize = [
        'small' => 100,
        'medium' => 1000,
        'large' => 10000,
    ];

    protected function setUp(): void
    {
        parent::setUp();

        // Disable query logging to prevent memory issues
        DB::disableQueryLog();

        // Clear all caches
        Cache::flush();
    }

    public function test_parking_slot_search_performance_with_small_dataset(): void
    {
        $this->createTestData('small');
        $this->assertSlotSearchPerformance(100); // 100ms threshold
    }

    public function test_parking_slot_search_performance_with_medium_dataset(): void
    {
        $this->createTestData('medium');
        $this->assertSlotSearchPerformance(200); // 200ms threshold
    }

    public function test_parking_slot_search_performance_with_large_dataset(): void
    {
        $this->createTestData('large');
        $this->assertSlotSearchPerformance(500); // 500ms threshold
    }

    public function test_concurrent_booking_performance(): void
    {
        $this->createTestData('medium');

        $slot = ParkingSlot::where('status', 'available')->first();
        $users = User::where('role', 'vehicle_owner')->take(10)->get();

        $startTime = microtime(true);

        // Simulate concurrent booking attempts
        $results = [];
        foreach ($users as $user) {
            try {
                DB::transaction(function () use ($slot, $user) {
                    // Simulate QR scan and booking process
                    $session = ParkingSession::create([
                        'user_id' => $user->id,
                        'parking_slot_id' => $slot->id,
                        'start_time' => now(),
                        'end_time' => now()->addHours(2),
                        'total_amount' => 100.00,
                        'status' => 'pending',
                        'confirmation_code' => 'TEST' . random_int(1000, 9999),
                    ]);

                    // Update slot status
                    $slot->update(['status' => 'occupied']);

                    return $session;
                });

                $results[] = 'success';
            } catch (\Exception $e) {
                $results[] = 'conflict';
            }
        }

        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;

        // Should complete within reasonable time
        $this->assertLessThan(2000, $executionTime, 'Concurrent booking resolution took too long');

        // Only one booking should succeed
        $successCount = count(array_filter($results, fn($r) => $r === 'success'));
        $this->assertEquals(1, $successCount, 'Multiple concurrent bookings succeeded');
    }

    public function test_geospatial_query_performance(): void
    {
        $this->createTestData('large');

        $queryTimes = [];

        // Test multiple geospatial queries
        for ($i = 0; $i < 10; $i++) {
            $latitude = 14.5995 + (rand(-100, 100) / 10000);
            $longitude = 120.9842 + (rand(-100, 100) / 10000);
            $radius = 1000;

            $startTime = microtime(true);

            // Execute geospatial query
            $slots = ParkingSlot::selectRaw('
                    *,
                    (6371000 * acos(
                        cos(radians(?)) * cos(radians(latitude)) *
                        cos(radians(longitude) - radians(?)) +
                        sin(radians(?)) * sin(radians(latitude))
                    )) AS distance_meters
                ', [$latitude, $longitude, $latitude])
                ->where('status', 'available')
                ->where('approval_status', 'published')
                ->having('distance_meters', '<=', $radius)
                ->orderBy('distance_meters')
                ->limit(20)
                ->get();

            $endTime = microtime(true);
            $queryTime = ($endTime - $startTime) * 1000;
            $queryTimes[] = $queryTime;

            $this->assertGreaterThan(0, $slots->count(), 'Geospatial query returned no results');
        }

        $averageTime = array_sum($queryTimes) / count($queryTimes);
        $maxTime = max($queryTimes);

        $this->assertLessThan(100, $averageTime, 'Average geospatial query time too slow');
        $this->assertLessThan(200, $maxTime, 'Max geospatial query time too slow');
    }

    public function test_payment_transaction_bulk_insert_performance(): void
    {
        $users = User::factory()->count(100)->create(['role' => 'vehicle_owner']);
        $sessions = ParkingSession::factory()->count(100)->create();

        $startTime = microtime(true);

        // Bulk insert payment transactions
        $transactions = [];
        foreach ($sessions as $index => $session) {
            $transactions[] = [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'user_id' => $users[$index]->id,
                'session_id' => $session->id,
                'amount' => 100.00,
                'platform_commission' => 15.00,
                'net_amount_to_slot_owner' => 85.00,
                'transaction_type' => 'parking_payment',
                'payment_method' => 'wallet',
                'status' => 'completed',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        PaymentTransaction::insert($transactions);

        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;

        $this->assertLessThan(1000, $executionTime, 'Bulk transaction insert took too long');
        $this->assertEquals(100, PaymentTransaction::count(), 'Not all transactions were inserted');
    }

    public function test_analytics_query_performance(): void
    {
        $this->createTestData('medium');

        // Create historical data for analytics
        $slots = ParkingSlot::take(50)->get();
        foreach ($slots as $slot) {
            // Create completed sessions for the last 30 days
            for ($day = 0; $day < 30; $day++) {
                $date = now()->subDays($day);
                $sessionsCount = rand(1, 5);

                for ($i = 0; $i < $sessionsCount; $i++) {
                    $user = User::where('role', 'vehicle_owner')->inRandomOrder()->first();

                    ParkingSession::create([
                        'user_id' => $user->id,
                        'parking_slot_id' => $slot->id,
                        'start_time' => $date->copy()->addHours(rand(8, 18)),
                        'end_time' => $date->copy()->addHours(rand(10, 20)),
                        'total_amount' => rand(50, 200),
                        'status' => 'completed',
                        'confirmation_code' => 'PERF' . random_int(1000, 9999),
                        'created_at' => $date,
                        'updated_at' => $date,
                    ]);
                }
            }
        }

        $startTime = microtime(true);

        // Execute complex analytics query
        $analytics = DB::table('parking_sessions')
            ->join('parking_slots', 'parking_sessions.parking_slot_id', '=', 'parking_slots.id')
            ->where('parking_sessions.status', 'completed')
            ->where('parking_sessions.created_at', '>=', now()->subDays(30))
            ->selectRaw('
                parking_slots.id,
                parking_slots.slot_number,
                COUNT(*) as total_sessions,
                SUM(parking_sessions.total_amount) as total_revenue,
                AVG(parking_sessions.total_amount) as avg_revenue,
                AVG(TIMESTAMPDIFF(MINUTE, parking_sessions.start_time, parking_sessions.end_time)) as avg_duration_minutes
            ')
            ->groupBy('parking_slots.id', 'parking_slots.slot_number')
            ->orderBy('total_revenue', 'desc')
            ->limit(20)
            ->get();

        $endTime = microtime(true);
        $executionTime = ($endTime - $startTime) * 1000;

        $this->assertLessThan(500, $executionTime, 'Analytics query took too long');
        $this->assertGreaterThan(0, $analytics->count(), 'Analytics query returned no results');
    }

    public function test_cache_performance(): void
    {
        $this->createTestData('small');

        $latitude = 14.5995;
        $longitude = 120.9842;
        $radius = 1000;

        // Test cache miss (first query)
        $startTime = microtime(true);
        $this->searchNearbySlots($latitude, $longitude, $radius);
        $endTime = microtime(true);
        $cacheMissTime = ($endTime - $startTime) * 1000;

        // Test cache hit (second query)
        $startTime = microtime(true);
        $this->searchNearbySlots($latitude, $longitude, $radius);
        $endTime = microtime(true);
        $cacheHitTime = ($endTime - $startTime) * 1000;

        // Cache hit should be significantly faster
        $this->assertLessThan($cacheMissTime / 5, $cacheHitTime, 'Cache hit not significantly faster');
        $this->assertLessThan(50, $cacheHitTime, 'Cache hit still too slow');
    }

    protected function createTestData(string $size): void
    {
        $count = $this->testDataSize[$size];

        echo "\nCreating {$size} dataset ({$count} records)...\n";

        // Create users
        User::factory()->count($count)->create(['role' => 'vehicle_owner']);
        User::factory()->count($count / 10)->create(['role' => 'slot_owner']);

        // Create parking slots with geographic distribution
        $baseLatitude = 14.5995;
        $baseLongitude = 120.9842;

        for ($i = 0; $i < $count; $i++) {
            // Distribute slots in a 10km radius
            $latOffset = (rand(-500, 500) / 100000);
            $lonOffset = (rand(-500, 500) / 100000);

            ParkingSlot::factory()->create([
                'latitude' => $baseLatitude + $latOffset,
                'longitude' => $baseLongitude + $lonOffset,
                'status' => $i % 4 === 0 ? 'occupied' : 'available', // 25% occupied
                'approval_status' => 'published',
            ]);
        }

        echo "Test data created successfully.\n";
    }

    protected function assertSlotSearchPerformance(int $maxTimeMs): void
    {
        $latitude = 14.5995;
        $longitude = 120.9842;
        $radius = 1000;

        $queryTimes = [];

        // Run multiple queries to get average performance
        for ($i = 0; $i < 5; $i++) {
            $startTime = microtime(true);
            $results = $this->searchNearbySlots($latitude, $longitude, $radius);
            $endTime = microtime(true);

            $queryTime = ($endTime - $startTime) * 1000;
            $queryTimes[] = $queryTime;

            $this->assertGreaterThan(0, count($results), 'Search returned no results');
        }

        $averageTime = array_sum($queryTimes) / count($queryTimes);
        $maxTime = max($queryTimes);

        $this->assertLessThan($maxTimeMs, $averageTime, "Average query time ({$averageTime}ms) exceeds threshold ({$maxTimeMs}ms)");
        $this->assertLessThan($maxTimeMs * 2, $maxTime, "Max query time ({$maxTime}ms) exceeds threshold");

        echo "\nQuery Performance: Avg {$averageTime}ms, Max {$maxTime}ms\n";
    }

    protected function searchNearbySlots(float $latitude, float $longitude, int $radius): array
    {
        return ParkingSlot::selectRaw('
                *,
                (6371000 * acos(
                    cos(radians(?)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(?)) +
                    sin(radians(?)) * sin(radians(latitude))
                )) AS distance_meters
            ', [$latitude, $longitude, $latitude])
            ->where('status', 'available')
            ->where('approval_status', 'published')
            ->having('distance_meters', '<=', $radius)
            ->orderBy('distance_meters')
            ->limit(20)
            ->get()
            ->toArray();
    }
}