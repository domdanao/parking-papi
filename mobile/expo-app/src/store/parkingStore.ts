import { create } from 'zustand';
import { ParkingSlot, ParkingSession, LocationCoords, QRScanResult, ParkingSearchParams } from '../types';
import apiService from '../services/apiService';

interface ParkingState {
  // State
  nearbySlots: ParkingSlot[];
  currentLocation: LocationCoords | null;
  selectedSlot: ParkingSlot | null;
  activeSessions: ParkingSession[];
  scanResult: QRScanResult | null;
  isLoading: boolean;
  error: string | null;

  // Search state
  searchParams: ParkingSearchParams | null;
  searchResults: ParkingSlot[];

  // Actions
  setCurrentLocation: (location: LocationCoords) => void;
  searchNearbySlots: (params: ParkingSearchParams) => Promise<void>;
  selectSlot: (slot: ParkingSlot) => void;
  clearSelectedSlot: () => void;
  scanQRCode: (qrData: string, location: LocationCoords) => Promise<QRScanResult | null>;
  activateBooking: (scanId: string, sessionToken: string, durationMinutes: number, paymentMethod: string) => Promise<boolean>;
  clearScanResult: () => void;
  refreshActiveSessions: () => Promise<void>;
  clearError: () => void;
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  // Initial state
  nearbySlots: [],
  currentLocation: null,
  selectedSlot: null,
  activeSessions: [],
  scanResult: null,
  isLoading: false,
  error: null,
  searchParams: null,
  searchResults: [],

  setCurrentLocation: (location: LocationCoords) => {
    set({ currentLocation: location });
  },

  searchNearbySlots: async (params: ParkingSearchParams) => {
    set({ isLoading: true, error: null, searchParams: params });

    try {
      const response = await apiService.searchNearbySlots(params);

      if (response.success && response.data) {
        set({
          searchResults: response.data.slots || [],
          nearbySlots: response.data.slots || [],
          isLoading: false,
        });
      } else {
        set({
          error: response.message || 'Failed to search parking slots',
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to search parking slots',
        isLoading: false,
      });
    }
  },

  selectSlot: (slot: ParkingSlot) => {
    set({ selectedSlot: slot });
  },

  clearSelectedSlot: () => {
    set({ selectedSlot: null });
  },

  scanQRCode: async (qrData: string, location: LocationCoords) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiService.scanQRCode(qrData, location);

      if (response.success && response.data) {
        const scanResult: QRScanResult = response.data;
        set({
          scanResult,
          isLoading: false,
        });
        return scanResult;
      } else {
        set({
          error: response.message || 'QR code scan failed',
          isLoading: false,
        });
        return null;
      }
    } catch (error: any) {
      set({
        error: error.message || 'QR code scan failed',
        isLoading: false,
      });
      return null;
    }
  },

  activateBooking: async (scanId: string, sessionToken: string, durationMinutes: number, paymentMethod: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiService.activatePayment({
        scan_id: scanId,
        session_token: sessionToken,
        duration_minutes: durationMinutes,
        payment_method: {
          type: paymentMethod,
        },
      });

      if (response.success) {
        // Clear scan result and refresh active sessions
        set({ scanResult: null, isLoading: false });
        get().refreshActiveSessions();
        return true;
      } else {
        set({
          error: response.message || 'Booking activation failed',
          isLoading: false,
        });
        return false;
      }
    } catch (error: any) {
      set({
        error: error.message || 'Booking activation failed',
        isLoading: false,
      });
      return false;
    }
  },

  clearScanResult: () => {
    set({ scanResult: null });
  },

  refreshActiveSessions: async () => {
    // This would fetch active sessions from the API
    // For now, we'll leave this as a placeholder since we don't have
    // a specific endpoint for user's active sessions
    set({ isLoading: true });

    try {
      // TODO: Implement API call for user's active sessions
      // const response = await apiService.getActiveSessions();
      set({ activeSessions: [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));