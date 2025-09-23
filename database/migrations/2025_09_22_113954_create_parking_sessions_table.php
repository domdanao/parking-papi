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
        Schema::create('parking_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignUuid('parking_slot_id')->constrained('parking_slots');

            // Session timing
            $table->timestamp('start_time');
            $table->timestamp('end_time');
            $table->timestamp('actual_end_time')->nullable();
            $table->integer('duration_minutes');

            // Payment and pricing
            $table->decimal('hourly_rate', 8, 2);
            $table->decimal('total_amount', 10, 2);
            $table->enum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded'])->default('pending');
            $table->enum('payment_method', ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'wallet', 'card']);

            // Session status
            $table->enum('status', ['pending', 'active', 'completed', 'cancelled', 'expired'])->default('pending');
            $table->string('confirmation_code', 20)->unique();

            $table->timestamps();

            // Indexes for performance
            $table->index(['user_id', 'status']);
            $table->index(['parking_slot_id', 'start_time']);
            $table->index('confirmation_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parking_sessions');
    }
};
