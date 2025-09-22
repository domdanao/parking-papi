<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParkingSession extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'parking_slot_id',
        'start_time',
        'end_time',
        'actual_end_time',
        'duration_minutes',
        'hourly_rate',
        'total_amount',
        'payment_status',
        'payment_method',
        'status',
        'confirmation_code',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'actual_end_time' => 'datetime',
            'hourly_rate' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    /**
     * Get the user that owns this parking session.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the parking slot for this session.
     */
    public function parkingSlot(): BelongsTo
    {
        return $this->belongsTo(ParkingSlot::class);
    }
}
