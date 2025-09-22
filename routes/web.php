<?php

use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\ParkingController;
use App\Http\Controllers\Web\SlotManagementController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Parking routes
    Route::prefix('parking')->group(function () {
        Route::get('search', [ParkingController::class, 'search'])->name('parking.search');
        Route::get('{id}', [ParkingController::class, 'show'])->name('parking.show');
    });

    // Slot management routes (for slot owners)
    Route::prefix('slots')->group(function () {
        Route::get('/', [SlotManagementController::class, 'index'])->name('slots.index');
        Route::get('create', [SlotManagementController::class, 'create'])->name('slots.create');
        Route::get('{id}/edit', [SlotManagementController::class, 'edit'])->name('slots.edit');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
