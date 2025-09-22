import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse, ParkingSearchParams, BookingRequest, LocationCoords } from '../types';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api' // Development
  : 'https://your-production-domain.com/api'; // Production

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear it
          await SecureStore.deleteItemAsync('auth_token');
          // You could trigger a logout action here
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(email: string, password: string, deviceName: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/auth/login', {
        email,
        password,
        device_name: deviceName,
      });

      if (response.data.success && response.data.data.token) {
        await SecureStore.setItemAsync('auth_token', response.data.data.token);
      }

      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async register(userData: {
    mobile_number: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    password: string;
    password_confirmation: string;
    role: string;
    device_name: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/auth/register', userData);

      if (response.data.success && response.data.data.token) {
        await SecureStore.setItemAsync('auth_token', response.data.data.token);
      }

      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      await SecureStore.deleteItemAsync('auth_token');
    }
  }

  async verifyOtp(mobileNumber: string, otpCode: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/auth/verify-otp', {
        mobile_number: mobileNumber,
        otp_code: otpCode,
      });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async getCurrentUser(): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/auth/user');
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Parking methods
  async searchNearbySlots(params: ParkingSearchParams): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/parking-slots/nearby', { params });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async getParkingSlotDetails(slotId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.get(`/parking-slots/${slotId}`);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async scanQRCode(qrData: string, location: LocationCoords): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/qr/scan', {
        qr_data: qrData,
        location: {
          ...location,
          accuracy: location.accuracy || 10.0,
        },
        scan_timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async activatePayment(booking: BookingRequest): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/qr/activate-payment', booking);
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Wallet and payment methods
  async topUpWallet(amount: number, paymentMethodId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/wallet/top-up', {
        amount,
        payment_method_id: paymentMethodId,
      });
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async getPaymentMethods(): Promise<ApiResponse> {
    try {
      const response = await this.client.get('/payment-methods');
      return response.data;
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Utility methods
  private handleError(error: any): ApiResponse {
    if (error.response?.data) {
      return error.response.data;
    }

    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
    };
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('auth_token');
    return !!token;
  }

  async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('auth_token');
  }
}

export const apiService = new ApiService();
export default apiService;