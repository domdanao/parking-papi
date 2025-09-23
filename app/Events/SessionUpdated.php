<?php

namespace App\Events;

use App\Models\ParkingSession;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SessionUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $session;
    public $changes;

    /**
     * Create a new event instance.
     */
    public function __construct(ParkingSession $session, array $changes = [])
    {
        $this->session = $session;
        $this->changes = $changes;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->session->user_id),
            new Channel('parking-area-' . $this->session->parkingSlot->area_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'session.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'session' => [
                'id' => $this->session->id,
                'user_id' => $this->session->user_id,
                'parking_slot_id' => $this->session->parking_slot_id,
                'status' => $this->session->status,
                'confirmation_code' => $this->session->confirmation_code,
                'start_time' => $this->session->start_time?->toISOString(),
                'end_time' => $this->session->end_time?->toISOString(),
                'expires_at' => $this->session->expires_at?->toISOString(),
                'amount' => $this->session->amount,
                'created_at' => $this->session->created_at->toISOString(),
                'updated_at' => $this->session->updated_at->toISOString(),
            ],
            'changes' => $this->changes,
            'timestamp' => now()->toISOString(),
        ];
    }
}