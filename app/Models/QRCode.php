<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QRCode extends Model
{
    use HasUuids;

    protected $table = 'qr_codes';

    protected $fillable = [
        'id',
        'parking_slot_id',
        'qr_data',
        'qr_image_path',
        'status',
        'expires_at',
        'scan_count',
        'last_scanned_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'last_scanned_at' => 'datetime',
        'scan_count' => 'integer',
    ];

    /**
     * Get the parking slot that owns this QR code
     */
    public function parkingSlot(): BelongsTo
    {
        return $this->belongsTo(ParkingSlot::class);
    }

    /**
     * Check if QR code is active
     */
    public function isActive(): bool
    {
        return $this->status === 'active' &&
               ($this->expires_at === null || $this->expires_at->isFuture());
    }

    /**
     * Check if QR code is expired
     */
    public function isExpired(): bool
    {
        return $this->status === 'expired' ||
               ($this->expires_at !== null && $this->expires_at->isPast());
    }
}
