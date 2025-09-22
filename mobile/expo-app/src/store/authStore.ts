import { create } from 'zustand';
import { User } from '../types';
import apiService from '../services/apiService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  verifyOtp: (mobileNumber: string, otpCode: string) => Promise<boolean>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiService.login(email, password, 'mobile-app');

      if (response.success && response.data) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } else {
        set({
          error: response.message || 'Login failed',
          isLoading: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      return false;
    }
  },

  register: async (userData: any) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiService.register({
        ...userData,
        device_name: 'mobile-app',
      });

      if (response.success && response.data) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } else {
        set({
          error: response.message || 'Registration failed',
          isLoading: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        error: error.message || 'Registration failed',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      await apiService.logout();
    } catch (error) {
      // Continue with logout even if API fails
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkAuthStatus: async () => {
    set({ isLoading: true });

    try {
      const isAuthenticated = await apiService.isAuthenticated();

      if (isAuthenticated) {
        const response = await apiService.getCurrentUser();

        if (response.success && response.data) {
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  verifyOtp: async (mobileNumber: string, otpCode: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiService.verifyOtp(mobileNumber, otpCode);

      if (response.success) {
        // Update user verification status
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              mobile_verified_at: new Date().toISOString(),
            },
            isLoading: false,
          });
        }
        return true;
      } else {
        set({
          error: response.message || 'OTP verification failed',
          isLoading: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        error: error.message || 'OTP verification failed',
        isLoading: false,
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user: User | null) => set({ user }),
}));