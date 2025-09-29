<?php

use App\Http\Controllers\QRCodeController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\ParkingController;
use App\Http\Controllers\Web\ScheduleManagementController;
use App\Http\Controllers\Web\SlotManagementController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('home');

// Health check endpoint for deployment monitoring
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'environment' => app()->environment(),
        'services' => [
            'database' => \DB::connection()->getPdo() ? 'connected' : 'disconnected',
            'cache' => \Cache::store()->getStore() instanceof \Illuminate\Cache\RedisStore ? 'connected' : 'disconnected',
        ],
    ]);
});

// Public QR Code scanning and booking routes - no authentication required
Route::prefix('parking')->group(function () {
    Route::get('scan/{encodedData}', [QRCodeController::class, 'handleScan'])->name('parking.scan');
    Route::post('scan', [QRCodeController::class, 'processScan'])->name('parking.scan.process');
    Route::post('book', [QRCodeController::class, 'bookSlot'])->name('parking.book');

    // Payment handling routes
    Route::get('payment/success', [QRCodeController::class, 'paymentSuccess'])->name('parking.payment.success');
    Route::get('payment/cancel', [QRCodeController::class, 'paymentCancel'])->name('parking.payment.cancel');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Authenticated parking routes
    Route::prefix('parking')->group(function () {
        Route::get('search', [ParkingController::class, 'search'])->name('parking.search');
        Route::get('{id}', [ParkingController::class, 'show'])->name('parking.show');
    });

    // Slot management routes (for slot owners)
    Route::prefix('slots')->group(function () {
        Route::get('/', [SlotManagementController::class, 'index'])->name('slots.index');
        Route::get('create', [SlotManagementController::class, 'create'])->name('slots.create');
        Route::get('{id}', [SlotManagementController::class, 'show'])->name('slots.show');
        Route::get('{id}/edit', [SlotManagementController::class, 'edit'])->name('slots.edit');
        Route::put('{id}', [SlotManagementController::class, 'update'])->name('slots.update');
        Route::get('{id}/qr-code', [SlotManagementController::class, 'getQRCode'])->name('slots.qr-code');
        Route::get('{id}/qr-code/download', [SlotManagementController::class, 'downloadQRCode'])->name('slots.qr-code.download');
    });

    // Schedule management routes (for slot owners)
    Route::prefix('schedules')->group(function () {
        Route::get('/', [ScheduleManagementController::class, 'index'])->name('schedules.index');
        Route::get('create', [ScheduleManagementController::class, 'create'])->name('schedules.create');
        Route::post('/', [ScheduleManagementController::class, 'store'])->name('schedules.store');
        Route::get('{slot}/schedules', [ScheduleManagementController::class, 'show'])->name('schedules.show');
        Route::get('{schedule}/edit', [ScheduleManagementController::class, 'edit'])->name('schedules.edit');
        Route::put('{schedule}', [ScheduleManagementController::class, 'update'])->name('schedules.update');
        Route::delete('{schedule}', [ScheduleManagementController::class, 'destroy'])->name('schedules.destroy');
        Route::post('preview', [ScheduleManagementController::class, 'preview'])->name('schedules.preview');
        Route::post('bulk-update', [ScheduleManagementController::class, 'bulkUpdate'])->name('schedules.bulk-update');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
