<?php

namespace App\Events;

use App\Models\ParkingSlot;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SlotStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $slot;
    public $oldStatus;
    public $newStatus;

    /**
     * Create a new event instance.
     */
    public function __construct(ParkingSlot $slot, string $oldStatus, string $newStatus)
    {
        $this->slot = $slot;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('parking-area-' . $this->slot->area_id),
            new Channel('parking-global'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'slot.status.changed';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'slot_id' => $this->slot->id,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'slot' => [
                'id' => $this->slot->id,
                'status' => $this->slot->status,
                'location' => [
                    'latitude' => $this->slot->latitude,
                    'longitude' => $this->slot->longitude,
                ],
                'base_hourly_rate' => $this->slot->base_hourly_rate,
                'updated_at' => $this->slot->updated_at->toISOString(),
            ],
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * Determine if this event should broadcast.
     */
    public function shouldBroadcast(): bool
    {
        // Only broadcast if status actually changed
        return $this->oldStatus !== $this->newStatus;
    }
}