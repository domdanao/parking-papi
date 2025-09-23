import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useParkingStoreWithWebSocket } from '@/stores/parking-store';
import { ConnectionStatus } from '@/components/connection-status';
import { usePage } from '@inertiajs/react';
import { SharedData } from '@/types';

interface ParkingContextType {
  store: ReturnType<typeof useParkingStoreWithWebSocket>;
}

const ParkingContext = createContext<ParkingContextType | null>(null);

interface ParkingProviderProps {
  children: ReactNode;
  showConnectionStatus?: boolean;
}

export function ParkingProvider({ children, showConnectionStatus = true }: ParkingProviderProps) {
  let userId: string | undefined;

  try {
    const page = usePage<SharedData>();
    userId = page?.props?.auth?.user?.id;
  } catch (error) {
    console.warn('[ParkingProvider] Could not access user from Inertia context:', error);
  }

  const store = useParkingStoreWithWebSocket(userId);

  // Initialize location on mount
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        await store.requestLocation();
      } catch (error) {
        console.warn('[ParkingProvider] Could not get initial location:', error);
        // Don't throw - user can still use the app without location
      }
    };

    initializeLocation();
  }, []);

  // Load active sessions on mount
  useEffect(() => {
    if (userId) {
      store.loadActiveSessions().catch(error => {
        console.warn('[ParkingProvider] Could not load active sessions:', error);
      });
    }
  }, [userId]);

  // Subscribe to areas based on user location
  useEffect(() => {
    const { userLocation } = store;
    if (userLocation && store.websocket.isConnected) {
      // Calculate which areas are nearby and subscribe to them
      // This is a simplified example - in production you'd have proper area calculation
      const nearbyAreaId = 'area-1'; // This would be calculated based on location
      store.websocket.subscribeToArea(nearbyAreaId);
    }
  }, [store.userLocation, store.websocket.isConnected]);

  const contextValue: ParkingContextType = {
    store
  };

  return (
    <ParkingContext.Provider value={contextValue}>
      {showConnectionStatus && (
        <ConnectionStatus
          connectionState={store.websocket.connectionState}
          queueSize={store.websocket.queueSize}
          onRetry={store.websocket.connect}
        />
      )}
      {children}
    </ParkingContext.Provider>
  );
}

export function useParkingContext() {
  const context = useContext(ParkingContext);
  if (!context) {
    throw new Error('useParkingContext must be used within a ParkingProvider');
  }
  return context;
}

// Convenience hooks for common use cases
export function useParkingStore() {
  const { store } = useParkingContext();
  return store;
}

export function useParkingWebSocketConnection() {
  const { store } = useParkingContext();
  return store.websocket;
}

export function useUserLocation() {
  const { store } = useParkingContext();
  return {
    location: store.userLocation,
    isLoading: store.isLocationLoading,
    error: store.locationError,
    requestLocation: store.requestLocation
  };
}

export function useNearbySlots() {
  const { store } = useParkingContext();
  return {
    slots: store.nearbySlots,
    visibleSlots: store.visibleSlots,
    selectedSlot: store.selectedSlot,
    isLoading: store.isLoadingSlots,
    error: store.error,
    selectSlot: store.setSelectedSlot,
    refreshSlots: () => {
      if (store.userLocation) {
        return store.loadNearbySlots(store.userLocation);
      }
      return Promise.resolve();
    }
  };
}

export function useParkingSessions() {
  const { store } = useParkingContext();
  return {
    activeSessions: store.activeSessions,
    currentSession: store.currentSession,
    sessionHistory: store.sessionHistory,
    isLoading: store.isLoadingSessions,
    error: store.error,
    refreshSessions: store.loadActiveSessions
  };
}

export function useParkingNotifications() {
  const { store } = useParkingContext();
  return {
    notifications: store.notifications,
    unreadCount: store.unreadNotificationCount,
    markAsRead: store.markNotificationRead,
    clearAll: store.clearNotifications
  };
}

export function useSearchFilters() {
  const { store } = useParkingContext();
  return {
    filters: store.searchFilters,
    updateFilters: store.updateSearchFilters
  };
}