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
        Schema::table('parking_sessions', function (Blueprint $table) {
            $table->json('rate_transitions')->nullable()->after('total_amount');
            $table->decimal('original_rate', 10, 2)->nullable()->after('rate_transitions');
            $table->decimal('final_calculated_amount', 10, 2)->nullable()->after('original_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('parking_sessions', function (Blueprint $table) {
            $table->dropColumn(['rate_transitions', 'original_rate', 'final_calculated_amount']);
        });
    }
};
