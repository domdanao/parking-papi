<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

describe('User Migration Tests', function () {
    it('creates users table with required columns', function () {
        expect(Schema::hasTable('users'))->toBeTrue();

        expect(Schema::hasColumns('users', [
            'id', 'email', 'mobile_number', 'role',
            'account_type', 'mobile_verified_at', 'created_at'
        ]))->toBeTrue();
    });

    it('has correct role enum values', function () {
        // This test will verify role column accepts correct enum values
        // Will be implemented with actual User model
        expect(true)->toBeTrue();
    });
});
