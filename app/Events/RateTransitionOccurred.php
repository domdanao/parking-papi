<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RateTransitionOccurred implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $transitionData;

    /**
     * Create a new event instance.
     */
    public function __construct(array $transitionData)
    {
        $this->transitionData = $transitionData;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->transitionData['user_id']),
            new PrivateChannel('session.'.$this->transitionData['session_id']),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'rate.transition.occurred';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->transitionData['session_id'],
            'transition_type' => $this->transitionData['transition_type'],
            'amount_difference' => $this->transitionData['amount_difference'],
            'new_rate' => $this->transitionData['new_rate'],
            'transition_time' => $this->transitionData['transition_time'],
        ];
    }
}
