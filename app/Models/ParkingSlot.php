<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ParkingSlot extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'slot_owner_id',
        'slot_number',
        'latitude',
        'longitude',
        'address',
        'landmark_references',
        'dimensions',
        'surface_type',
        'accessibility_features',
        'vehicle_compatibility',
        'base_hourly_rate',
        'pricing_variations',
        'minimum_duration_minutes',
        'maximum_duration_minutes',
        'status',
        'approval_status',
        'is_active',
        'amenities',
        'restrictions',
        'special_conditions',
        'qr_code_hash',
        'photos',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'dimensions' => 'json',
            'accessibility_features' => 'json',
            'vehicle_compatibility' => 'json',
            'base_hourly_rate' => 'decimal:2',
            'pricing_variations' => 'json',
            'is_active' => 'boolean',
            'amenities' => 'json',
            'restrictions' => 'json',
            'photos' => 'json',
            'version' => 'integer',
        ];
    }

    /**
     * Get the slot owner that owns this parking slot.
     */
    public function slotOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'slot_owner_id');
    }

    /**
     * Get the parking sessions for this slot.
     */
    public function parkingSessions(): HasMany
    {
        return $this->hasMany(ParkingSession::class);
    }

    /**
     * Get the QR codes for this slot.
     */
    public function qrCodes(): HasMany
    {
        return $this->hasMany(QRCode::class);
    }
}