<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use App\Models\ParkingSlot;
use App\Models\ParkingSession;
use App\Models\User;

class CacheService
{
    // Cache TTL constants (in seconds)
    public const TTL_SHORT = 300;      // 5 minutes
    public const TTL_MEDIUM = 1800;    // 30 minutes
    public const TTL_LONG = 3600;      // 1 hour
    public const TTL_VERY_LONG = 86400; // 24 hours

    // Cache key prefixes
    private const PREFIX_PARKING_SLOTS = 'parking_slots';
    private const PREFIX_USER_SESSIONS = 'user_sessions';
    private const PREFIX_SLOT_AVAILABILITY = 'slot_availability';
    private const PREFIX_ANALYTICS = 'analytics';
    private const PREFIX_NEARBY_SLOTS = 'nearby_slots';

    /**
     * Cache nearby parking slots for a specific location
     */
    public function cacheNearbySlots(float $latitude, float $longitude, int $radius, array $slots): void
    {
        $key = $this->getNearbySlotsCacheKey($latitude, $longitude, $radius);
        Cache::put($key, $slots, self::TTL_SHORT);
    }

    /**
     * Get cached nearby parking slots
     */
    public function getCachedNearbySlots(float $latitude, float $longitude, int $radius): ?array
    {
        $key = $this->getNearbySlotsCacheKey($latitude, $longitude, $radius);
        return Cache::get($key);
    }

    /**
     * Cache individual parking slot data
     */
    public function cacheParkingSlot(ParkingSlot $slot): void
    {
        $key = self::PREFIX_PARKING_SLOTS . ':' . $slot->id;
        Cache::put($key, $slot, self::TTL_MEDIUM);
    }

    /**
     * Get cached parking slot
     */
    public function getCachedParkingSlot(string $slotId): ?ParkingSlot
    {
        $key = self::PREFIX_PARKING_SLOTS . ':' . $slotId;
        return Cache::get($key);
    }

    /**
     * Cache parking slot availability status
     */
    public function cacheSlotAvailability(string $slotId, string $status): void
    {
        $key = self::PREFIX_SLOT_AVAILABILITY . ':' . $slotId;
        Cache::put($key, $status, self::TTL_SHORT);
    }

    /**
     * Get cached slot availability
     */
    public function getCachedSlotAvailability(string $slotId): ?string
    {
        $key = self::PREFIX_SLOT_AVAILABILITY . ':' . $slotId;
        return Cache::get($key);
    }

    /**
     * Cache user's active sessions
     */
    public function cacheUserSessions(string $userId, array $sessions): void
    {
        $key = self::PREFIX_USER_SESSIONS . ':' . $userId;
        Cache::put($key, $sessions, self::TTL_SHORT);
    }

    /**
     * Get cached user sessions
     */
    public function getCachedUserSessions(string $userId): ?array
    {
        $key = self::PREFIX_USER_SESSIONS . ':' . $userId;
        return Cache::get($key);
    }

    /**
     * Cache analytics data
     */
    public function cacheAnalytics(string $type, string $identifier, array $data): void
    {
        $key = self::PREFIX_ANALYTICS . ':' . $type . ':' . $identifier;
        Cache::put($key, $data, self::TTL_LONG);
    }

    /**
     * Get cached analytics data
     */
    public function getCachedAnalytics(string $type, string $identifier): ?array
    {
        $key = self::PREFIX_ANALYTICS . ':' . $type . ':' . $identifier;
        return Cache::get($key);
    }

    /**
     * Cache slot performance metrics
     */
    public function cacheSlotPerformance(string $slotId, array $metrics): void
    {
        $key = self::PREFIX_ANALYTICS . ':slot_performance:' . $slotId;
        Cache::put($key, $metrics, self::TTL_LONG);
    }

    /**
     * Get cached slot performance metrics
     */
    public function getCachedSlotPerformance(string $slotId): ?array
    {
        $key = self::PREFIX_ANALYTICS . ':slot_performance:' . $slotId;
        return Cache::get($key);
    }

    /**
     * Invalidate cache for a specific parking slot
     */
    public function invalidateParkingSlot(string $slotId): void
    {
        $patterns = [
            self::PREFIX_PARKING_SLOTS . ':' . $slotId,
            self::PREFIX_SLOT_AVAILABILITY . ':' . $slotId,
            self::PREFIX_ANALYTICS . ':slot_performance:' . $slotId,
        ];

        foreach ($patterns as $pattern) {
            Cache::forget($pattern);
        }

        // Also clear nearby slots cache that might include this slot
        $this->invalidateNearbySlots();
    }

    /**
     * Invalidate user session cache
     */
    public function invalidateUserSessions(string $userId): void
    {
        $key = self::PREFIX_USER_SESSIONS . ':' . $userId;
        Cache::forget($key);
    }

    /**
     * Invalidate nearby slots cache (used when slot data changes)
     */
    public function invalidateNearbySlots(): void
    {
        // Use Redis pattern deletion for efficiency
        if (Cache::getStore() instanceof \Illuminate\Cache\RedisStore) {
            $pattern = self::PREFIX_NEARBY_SLOTS . ':*';
            $this->deleteByPattern($pattern);
        }
    }

    /**
     * Invalidate analytics cache
     */
    public function invalidateAnalytics(string $type = null, string $identifier = null): void
    {
        if ($type && $identifier) {
            $key = self::PREFIX_ANALYTICS . ':' . $type . ':' . $identifier;
            Cache::forget($key);
        } else {
            // Clear all analytics cache
            $pattern = self::PREFIX_ANALYTICS . ':*';
            $this->deleteByPattern($pattern);
        }
    }

    /**
     * Cache frequently accessed data with tags for easy invalidation
     */
    public function cacheWithTags(array $tags, string $key, mixed $value, int $ttl = self::TTL_MEDIUM): void
    {
        Cache::tags($tags)->put($key, $value, $ttl);
    }

    /**
     * Get cached data by tags
     */
    public function getCachedWithTags(array $tags, string $key): mixed
    {
        return Cache::tags($tags)->get($key);
    }

    /**
     * Flush cache by tags
     */
    public function flushByTags(array $tags): void
    {
        Cache::tags($tags)->flush();
    }

    /**
     * Get cache statistics
     */
    public function getCacheStats(): array
    {
        $stats = [
            'total_keys' => 0,
            'memory_usage' => 0,
            'hit_rate' => 0,
            'keyspace_hits' => 0,
            'keyspace_misses' => 0,
        ];

        try {
            if (Cache::getStore() instanceof \Illuminate\Cache\RedisStore) {
                $redis = Redis::connection();
                $info = $redis->info('stats');

                $stats['keyspace_hits'] = $info['keyspace_hits'] ?? 0;
                $stats['keyspace_misses'] = $info['keyspace_misses'] ?? 0;
                $stats['total_keys'] = $redis->dbsize();

                if ($stats['keyspace_hits'] + $stats['keyspace_misses'] > 0) {
                    $stats['hit_rate'] = round(
                        ($stats['keyspace_hits'] / ($stats['keyspace_hits'] + $stats['keyspace_misses'])) * 100,
                        2
                    );
                }

                $memoryInfo = $redis->info('memory');
                $stats['memory_usage'] = $memoryInfo['used_memory'] ?? 0;
            }
        } catch (\Exception $e) {
            // Return default stats if Redis is not available
        }

        return $stats;
    }

    /**
     * Warm up cache with frequently accessed data
     */
    public function warmUpCache(): void
    {
        // Cache active parking slots
        $activeSlots = ParkingSlot::where('status', 'available')
            ->where('approval_status', 'published')
            ->limit(100)
            ->get();

        foreach ($activeSlots as $slot) {
            $this->cacheParkingSlot($slot);
            $this->cacheSlotAvailability($slot->id, $slot->status);
        }

        // Cache recent active sessions for analytics
        $recentSessions = ParkingSession::where('status', 'active')
            ->with('parkingSlot')
            ->limit(50)
            ->get();

        $sessionsByUser = $recentSessions->groupBy('user_id');
        foreach ($sessionsByUser as $userId => $sessions) {
            $this->cacheUserSessions($userId, $sessions->toArray());
        }
    }

    /**
     * Clear all cache
     */
    public function clearAllCache(): void
    {
        Cache::flush();
    }

    /**
     * Generate cache key for nearby slots
     */
    private function getNearbySlotsCacheKey(float $latitude, float $longitude, int $radius): string
    {
        // Round coordinates to reduce cache key variations
        $lat = round($latitude, 4);
        $lng = round($longitude, 4);
        return self::PREFIX_NEARBY_SLOTS . ":{$lat}:{$lng}:{$radius}";
    }

    /**
     * Delete cache keys by pattern (Redis only)
     */
    private function deleteByPattern(string $pattern): void
    {
        try {
            if (Cache::getStore() instanceof \Illuminate\Cache\RedisStore) {
                $redis = Redis::connection();
                $keys = $redis->keys($pattern);

                if (!empty($keys)) {
                    $redis->del($keys);
                }
            }
        } catch (\Exception $e) {
            // Silently fail if Redis is not available
        }
    }

    /**
     * Increment cache counter
     */
    public function incrementCounter(string $key, int $value = 1): int
    {
        return Cache::increment($key, $value);
    }

    /**
     * Get cache counter value
     */
    public function getCounter(string $key): int
    {
        return Cache::get($key, 0);
    }

    /**
     * Set cache counter with expiry
     */
    public function setCounter(string $key, int $value, int $ttl = self::TTL_LONG): void
    {
        Cache::put($key, $value, $ttl);
    }

    /**
     * Cache expensive computation results
     */
    public function remember(string $key, int $ttl, callable $callback): mixed
    {
        return Cache::remember($key, $ttl, $callback);
    }

    /**
     * Cache expensive computation results with tags
     */
    public function rememberWithTags(array $tags, string $key, int $ttl, callable $callback): mixed
    {
        return Cache::tags($tags)->remember($key, $ttl, $callback);
    }
}