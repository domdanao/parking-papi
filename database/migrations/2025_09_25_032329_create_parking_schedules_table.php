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
        Schema::create('parking_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('parking_slot_id');
            $table->enum('schedule_type', ['availability_window', 'pricing_tier', 'free_period', 'restriction_zone']);
            $table->json('recurrence_pattern'); // Store weekly patterns, seasonal schedules, holiday exceptions
            $table->json('time_rules'); // Start/end times, days of week, date ranges
            $table->json('pricing_rules'); // Rate information, discounts
            $table->datetime('effective_from');
            $table->datetime('effective_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0); // Higher priority overrides lower priority
            $table->string('name')->nullable(); // Human-readable schedule name
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('parking_slot_id')->references('id')->on('parking_slots')->onDelete('cascade');
            $table->index(['parking_slot_id', 'is_active']);
            $table->index(['effective_from', 'effective_until']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parking_schedules');
    }
};
