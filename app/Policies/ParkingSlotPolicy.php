<?php

namespace App\Policies;

use App\Models\ParkingSlot;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ParkingSlotPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, ParkingSlot $parkingSlot): bool
    {
        return $user->id === $parkingSlot->slot_owner_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role === 'slot_owner';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ParkingSlot $parkingSlot): bool
    {
        return $user->id === $parkingSlot->slot_owner_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ParkingSlot $parkingSlot): bool
    {
        return $user->id === $parkingSlot->slot_owner_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ParkingSlot $parkingSlot): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ParkingSlot $parkingSlot): bool
    {
        return false;
    }
}
