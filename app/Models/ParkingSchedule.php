<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ParkingSchedule extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'parking_slot_id',
        'schedule_type',
        'recurrence_pattern',
        'time_rules',
        'pricing_rules',
        'effective_from',
        'effective_until',
        'is_active',
        'priority',
        'name',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'recurrence_pattern' => 'array',
            'time_rules' => 'array',
            'pricing_rules' => 'array',
            'effective_from' => 'datetime',
            'effective_until' => 'datetime',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid();
            }
        });
    }

    public function parkingSlot(): BelongsTo
    {
        return $this->belongsTo(ParkingSlot::class);
    }

    /**
     * Check if this schedule is currently active based on time rules
     */
    public function isCurrentlyActive(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $now = now();

        // Check effective date range
        if ($now->lt($this->effective_from)) {
            return false;
        }

        if ($this->effective_until && $now->gt($this->effective_until)) {
            return false;
        }

        return $this->matchesCurrentTime($now);
    }

    /**
     * Check if current time matches the schedule's time rules
     */
    public function matchesCurrentTime($datetime): bool
    {
        $timeRules = $this->time_rules;

        if (empty($timeRules)) {
            return true;
        }

        // Check day of week
        if (isset($timeRules['days_of_week'])) {
            $currentDayOfWeek = $datetime->dayOfWeek; // 0 = Sunday, 6 = Saturday
            if (! in_array($currentDayOfWeek, $timeRules['days_of_week'])) {
                return false;
            }
        }

        // Check time of day
        if (isset($timeRules['start_time'], $timeRules['end_time'])) {
            $currentTime = $datetime->format('H:i:s');
            $startTime = $timeRules['start_time'];
            $endTime = $timeRules['end_time'];

            // Handle overnight periods (e.g., 22:00 to 06:00)
            if ($startTime > $endTime) {
                if (! ($currentTime >= $startTime || $currentTime <= $endTime)) {
                    return false;
                }
            } else {
                if (! ($currentTime >= $startTime && $currentTime <= $endTime)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get the pricing rate for this schedule
     */
    public function getCurrentRate(): ?float
    {
        if ($this->schedule_type === 'free_period') {
            return 0.0;
        }

        if ($this->schedule_type === 'pricing_tier' && isset($this->pricing_rules['hourly_rate'])) {
            return (float) $this->pricing_rules['hourly_rate'];
        }

        return null;
    }

    /**
     * Scope to get active schedules for a parking slot
     */
    public function scopeActiveForSlot($query, string $slotId)
    {
        return $query->where('parking_slot_id', $slotId)
            ->where('is_active', true)
            ->where('effective_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('effective_until')
                    ->orWhere('effective_until', '>=', now());
            })
            ->orderByDesc('priority');
    }

    /**
     * Scope to get schedules by type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('schedule_type', $type);
    }
}
