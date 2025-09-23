<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'mobile_number' => 'required|string|regex:/^\+[1-9]\d{1,14}$/|unique:users',
            'email' => 'sometimes|email|unique:users',
            'first_name' => 'sometimes|string|max:50',
            'last_name' => 'sometimes|string|max:50',
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => 'required|in:vehicle_owner,slot_owner',
            'device_name' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->first_name . ' ' . $request->last_name,
            'email' => $request->email,
            'mobile_number' => $request->mobile_number,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'role' => $request->role,
            'account_type' => 'registered',
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken($request->device_name)->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. OTP sent to mobile number.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'mobile_number' => $user->mobile_number,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'role' => $user->role,
                    'account_type' => $user->account_type,
                    'email_verified_at' => $user->email_verified_at,
                    'mobile_verified_at' => $user->mobile_verified_at,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ],
                'token' => $token,
                'expires_at' => now()->addDays(30),
                'otp_required' => true
            ]
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required_without:mobile_number|email',
            'mobile_number' => 'required_without:email|string',
            'password' => 'required|string',
            'device_name' => 'required|string',
            'remember_me' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        $credentials = $request->only(['password']);
        if ($request->email) {
            $credentials['email'] = $request->email;
        } else {
            $credentials['mobile_number'] = $request->mobile_number;
        }

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        $user = Auth::user();
        $token = $user->createToken($request->device_name)->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'mobile_number' => $user->mobile_number,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'role' => $user->role,
                    'created_at' => $user->created_at,
                ],
                'token' => $token,
                'expires_at' => now()->addDays(30)
            ]
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'mobile_number' => 'required|string|regex:/^\+[1-9]\d{1,14}$/',
            'otp_code' => 'required|string|regex:/^\d{6}$/'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        // For demo purposes, accept any 6-digit OTP
        if (strlen($request->otp_code) !== 6) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired OTP'
            ], 400);
        }

        $user = Auth::user();
        $user->mobile_verified_at = now();
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Mobile number verified successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'mobile_number' => $user->mobile_number,
                    'mobile_verified_at' => $user->mobile_verified_at,
                ],
                'mobile_verified' => true
            ]
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'email' => $user->email,
                'mobile_number' => $user->mobile_number,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'role' => $user->role,
                'account_type' => $user->account_type,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ]
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors()
            ], 422);
        }

        // For demo purposes, always return success
        return response()->json([
            'success' => true,
            'message' => 'Password reset link sent to your email'
        ]);
    }
}