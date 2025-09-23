<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ParkingSlotController;
use App\Http\Controllers\Api\QRScanningController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\AnalyticsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Authentication routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('auth:sanctum');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
});

// Parking slots routes
Route::prefix('parking-slots')->group(function () {
    Route::get('/nearby', [ParkingSlotController::class, 'nearby'])->middleware('auth:sanctum');
    Route::post('/', [ParkingSlotController::class, 'store'])->middleware('auth:sanctum');
    Route::get('/{id}', [ParkingSlotController::class, 'show'])->middleware('auth:sanctum');
    Route::put('/{id}', [ParkingSlotController::class, 'update'])->middleware('auth:sanctum');
    Route::delete('/{id}', [ParkingSlotController::class, 'destroy'])->middleware('auth:sanctum');
    Route::get('/{id}/availability', [ParkingSlotController::class, 'availability'])->middleware('auth:sanctum');
});

// QR scanning routes
Route::prefix('qr')->middleware('auth:sanctum')->group(function () {
    Route::post('/scan', [QRScanningController::class, 'scan']);
    Route::post('/activate-payment', [QRScanningController::class, 'activatePayment']);
});

// Payment routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/wallet/top-up', [PaymentController::class, 'topUp']);
    Route::get('/payment-methods', [PaymentController::class, 'getPaymentMethods']);
});

// Analytics routes
Route::prefix('analytics')->middleware('auth:sanctum')->group(function () {
    Route::get('/slot-performance', [AnalyticsController::class, 'slotPerformance']);
    Route::get('/platform-health', [AnalyticsController::class, 'platformHealth']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
