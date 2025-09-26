<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop and recreate the table to change from auto-increment ID to UUID
        Schema::dropIfExists('qr_codes');

        Schema::create('qr_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Add parking slot relationship
            $table->uuid('parking_slot_id');
            $table->foreign('parking_slot_id')->references('id')->on('parking_slots')->onDelete('cascade');

            // QR code data
            $table->text('qr_data');
            $table->string('qr_image_path')->nullable();

            // Status and metadata
            $table->enum('status', ['active', 'inactive', 'expired'])->default('active');
            $table->timestamp('expires_at')->nullable();

            // Usage tracking
            $table->integer('scan_count')->default(0);
            $table->timestamp('last_scanned_at')->nullable();

            $table->timestamps();

            // Add index for faster queries
            $table->index(['parking_slot_id', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qr_codes');

        // Recreate original simple table
        Schema::create('qr_codes', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
    }
};
