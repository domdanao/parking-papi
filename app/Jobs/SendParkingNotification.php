<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\ParkingSession;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ParkingExpirationWarning;
use App\Notifications\ParkingSessionCompleted;
use App\Notifications\QRScanConfirmation;

class SendParkingNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $userId,
        public string $notificationType,
        public array $data = []
    ) {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        Log::info('Sending parking notification', [
            'user_id' => $this->userId,
            'type' => $this->notificationType,
            'data' => $this->data
        ]);

        try {
            $user = User::find($this->userId);

            if (!$user) {
                Log::warning('User not found for notification', [
                    'user_id' => $this->userId
                ]);
                return;
            }

            switch ($this->notificationType) {
                case 'parking_expiration_warning':
                    $this->sendExpirationWarning($user);
                    break;

                case 'parking_session_completed':
                    $this->sendSessionCompleted($user);
                    break;

                case 'qr_scan_confirmation':
                    $this->sendQRScanConfirmation($user);
                    break;

                default:
                    Log::warning('Unknown notification type', [
                        'type' => $this->notificationType
                    ]);
                    return;
            }

            Log::info('Parking notification sent successfully', [
                'user_id' => $this->userId,
                'type' => $this->notificationType
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send parking notification', [
                'user_id' => $this->userId,
                'type' => $this->notificationType,
                'error' => $e->getMessage()
            ]);

            $this->fail($e);
        }
    }

    private function sendExpirationWarning(User $user): void
    {
        $session = ParkingSession::find($this->data['session_id'] ?? null);

        if ($session) {
            $minutesRemaining = $this->data['minutes_remaining'] ?? 0;
            Notification::send($user, new ParkingExpirationWarning($session, $minutesRemaining));
        }
    }

    private function sendSessionCompleted(User $user): void
    {
        $session = ParkingSession::find($this->data['session_id'] ?? null);

        if ($session) {
            Notification::send($user, new ParkingSessionCompleted($session));
        }
    }

    private function sendQRScanConfirmation(User $user): void
    {
        $scanData = $this->data['scan_data'] ?? [];
        Notification::send($user, new QRScanConfirmation($scanData));
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Send parking notification job failed', [
            'user_id' => $this->userId,
            'type' => $this->notificationType,
            'exception' => $exception->getMessage()
        ]);
    }
}
