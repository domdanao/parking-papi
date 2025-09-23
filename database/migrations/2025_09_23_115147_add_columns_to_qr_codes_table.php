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
        Schema::table('qr_codes', function (Blueprint $table) {
            // Drop existing id column and add UUID
            $table->dropColumn('id');
        });

        Schema::table('qr_codes', function (Blueprint $table) {
            // Add UUID primary key
            $table->uuid('id')->primary()->first();

            // Add parking slot relationship
            $table->uuid('parking_slot_id')->after('id');
            $table->foreign('parking_slot_id')->references('id')->on('parking_slots')->onDelete('cascade');

            // QR code data
            $table->text('qr_data')->after('parking_slot_id');
            $table->string('qr_image_path')->nullable()->after('qr_data');

            // Status and metadata
            $table->enum('status', ['active', 'inactive', 'expired'])->default('active')->after('qr_image_path');
            $table->timestamp('expires_at')->nullable()->after('status');

            // Usage tracking
            $table->integer('scan_count')->default(0)->after('expires_at');
            $table->timestamp('last_scanned_at')->nullable()->after('scan_count');

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
        Schema::table('qr_codes', function (Blueprint $table) {
            $table->dropForeign(['parking_slot_id']);
            $table->dropIndex(['parking_slot_id', 'status']);
            $table->dropIndex(['status']);

            $table->dropColumn([
                'parking_slot_id',
                'qr_data',
                'qr_image_path',
                'status',
                'expires_at',
                'scan_count',
                'last_scanned_at'
            ]);
        });

        Schema::table('qr_codes', function (Blueprint $table) {
            $table->dropColumn('id');
            $table->id()->first();
        });
    }
};