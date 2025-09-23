<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add indexes for parking_slots table (skip those already created in original migration)
        Schema::table('parking_slots', function (Blueprint $table) {
            // Status index for availability queries (status+approval already exists)
            $table->index('status', 'idx_parking_slots_status');

            // Created at index for ordering
            $table->index('created_at', 'idx_parking_slots_created');

            // Base hourly rate index for price filtering
            $table->index('base_hourly_rate', 'idx_parking_slots_rate');

            // Is active index for filtering
            $table->index('is_active', 'idx_parking_slots_active');

            // QR code hash index
            $table->index('qr_code_hash', 'idx_parking_slots_qr_hash');
        });

        // Add indexes for parking_sessions table
        Schema::table('parking_sessions', function (Blueprint $table) {
            // User sessions index
            $table->index('user_id', 'idx_parking_sessions_user');

            // Slot sessions index
            $table->index('parking_slot_id', 'idx_parking_sessions_slot');

            // Status index for filtering active sessions
            $table->index('status', 'idx_parking_sessions_status');

            // Time-based indexes for analytics
            $table->index('start_time', 'idx_parking_sessions_start');
            $table->index('end_time', 'idx_parking_sessions_end');

            // Composite index for user and status
            $table->index(['user_id', 'status'], 'idx_parking_sessions_user_status');

            // Confirmation code index for quick lookups
            $table->index('confirmation_code', 'idx_parking_sessions_confirmation');

            // Created at index for ordering
            $table->index('created_at', 'idx_parking_sessions_created');
        });

        // Skip payment_transactions and qr_codes as they don't have required columns yet

        // Add indexes for users table
        Schema::table('users', function (Blueprint $table) {
            // Role index for role-based queries
            $table->index('role', 'idx_users_role');

            // Account type index
            $table->index('account_type', 'idx_users_account_type');

            // Verification status indexes
            $table->index('email_verified_at', 'idx_users_email_verified');
            $table->index('mobile_verified_at', 'idx_users_mobile_verified');

            // Created at index
            $table->index('created_at', 'idx_users_created');
        });

        // Note: PostGIS extension would need to be enabled for spatial indexes
        // DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');
        // DB::statement('CREATE INDEX IF NOT EXISTS idx_parking_slots_location_gist ON parking_slots USING GIST (ST_Point(longitude, latitude))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // PostGIS spatial index would be dropped here if it was created
        // DB::statement('DROP INDEX IF EXISTS idx_parking_slots_location_gist');

        // Drop indexes from users table
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_role');
            $table->dropIndex('idx_users_account_type');
            $table->dropIndex('idx_users_email_verified');
            $table->dropIndex('idx_users_mobile_verified');
            $table->dropIndex('idx_users_created');
        });

        // Skip dropping indexes from payment_transactions and qr_codes as they were not created

        // Drop indexes from parking_sessions table
        Schema::table('parking_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_parking_sessions_user');
            $table->dropIndex('idx_parking_sessions_slot');
            $table->dropIndex('idx_parking_sessions_status');
            $table->dropIndex('idx_parking_sessions_start');
            $table->dropIndex('idx_parking_sessions_end');
            $table->dropIndex('idx_parking_sessions_user_status');
            $table->dropIndex('idx_parking_sessions_confirmation');
            $table->dropIndex('idx_parking_sessions_created');
        });

        // Drop indexes from parking_slots table
        Schema::table('parking_slots', function (Blueprint $table) {
            $table->dropIndex('idx_parking_slots_status');
            $table->dropIndex('idx_parking_slots_created');
            $table->dropIndex('idx_parking_slots_rate');
            $table->dropIndex('idx_parking_slots_active');
            $table->dropIndex('idx_parking_slots_qr_hash');
        });
    }
};