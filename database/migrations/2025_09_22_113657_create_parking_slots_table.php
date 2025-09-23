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
        Schema::create('parking_slots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('slot_owner_id')->constrained('users');
            $table->string('slot_number');

            // Location data (using standard lat/lng for PostgreSQL compatibility)
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->string('address');
            $table->text('landmark_references')->nullable();

            // Physical description
            $table->json('dimensions'); // {length_meters, width_meters, height_clearance_meters}
            $table->enum('surface_type', ['asphalt', 'concrete', 'gravel', 'paved', 'unpaved']);
            $table->json('accessibility_features')->nullable();
            $table->json('vehicle_compatibility'); // ['car', 'motorcycle', 'truck', 'van']

            // Pricing structure
            $table->decimal('base_hourly_rate', 8, 2);
            $table->json('pricing_variations')->nullable();
            $table->integer('minimum_duration_minutes')->default(30);
            $table->integer('maximum_duration_minutes')->default(1440); // 24 hours

            // Status and availability
            $table->enum('status', ['available', 'occupied', 'reserved', 'maintenance'])->default('available');
            $table->enum('approval_status', ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'published'])->default('draft');
            $table->boolean('is_active')->default(false);

            // Features and restrictions
            $table->json('amenities')->nullable(); // ['covered', 'secured', 'ev_charging']
            $table->json('restrictions')->nullable();
            $table->text('special_conditions')->nullable();

            // QR Code and media
            $table->string('qr_code_hash')->nullable()->unique();
            $table->json('photos')->nullable();

            $table->integer('version')->default(1); // Optimistic locking
            $table->timestamps();

            // Indexes for performance
            $table->index(['latitude', 'longitude']);
            $table->index(['status', 'approval_status']);
            $table->index('slot_owner_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parking_slots');
    }
};
