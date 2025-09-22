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
        Schema::table('users', function (Blueprint $table) {
            $table->string('mobile_number')->unique()->after('email');
            $table->string('first_name')->nullable()->after('mobile_number');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('driver_license')->nullable()->after('last_name');
            $table->enum('role', ['vehicle_owner', 'slot_owner', 'platform_owner', 'enforcer'])->after('driver_license');
            $table->enum('account_type', ['temporary', 'registered'])->default('registered')->after('role');
            $table->timestamp('mobile_verified_at')->nullable()->after('email_verified_at');
            $table->integer('version')->default(1)->after('mobile_verified_at'); // Optimistic locking
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'mobile_number',
                'first_name',
                'last_name',
                'driver_license',
                'role',
                'account_type',
                'mobile_verified_at',
                'version'
            ]);
        });
    }
};
