<?php

namespace App\Jobs;

use App\Models\ParkingSlot;
use App\Services\CacheService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class UpdateSlotAvailability implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $slotId,
        public string $status
    ) {
        $this->onQueue('parking-operations');
    }

    public function handle(CacheService $cacheService): void
    {
        Log::info('Updating slot availability', [
            'slot_id' => $this->slotId,
            'status' => $this->status
        ]);

        try {
            $slot = ParkingSlot::find($this->slotId);

            if (!$slot) {
                Log::warning('Slot not found for availability update', [
                    'slot_id' => $this->slotId
                ]);
                return;
            }

            $oldStatus = $slot->status;
            $slot->update(['status' => $this->status]);

            $cacheService->invalidateParkingSlot($this->slotId);
            $cacheService->invalidateNearbySlots();

            Log::info('Slot availability updated successfully', [
                'slot_id' => $this->slotId,
                'old_status' => $oldStatus,
                'new_status' => $this->status
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update slot availability', [
                'slot_id' => $this->slotId,
                'status' => $this->status,
                'error' => $e->getMessage()
            ]);

            $this->fail($e);
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Update slot availability job failed', [
            'slot_id' => $this->slotId,
            'status' => $this->status,
            'exception' => $exception->getMessage()
        ]);
    }
}
