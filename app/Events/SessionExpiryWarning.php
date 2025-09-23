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

class SessionExpiryWarning implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $session;
    public $minutesRemaining;

    /**
     * Create a new event instance.
     */
    public function __construct(ParkingSession $session, int $minutesRemaining)
    {
        $this->session = $session;
        $this->minutesRemaining = $minutesRemaining;
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
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'session.expiry.warning';
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
                'expires_at' => $this->session->expires_at?->toISOString(),
                'amount' => $this->session->amount,
            ],
            'minutes_remaining' => $this->minutesRemaining,
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * Determine if this event should broadcast.
     */
    public function shouldBroadcast(): bool
    {
        // Only broadcast warning for active sessions
        return $this->session->status === 'active';
    }
}