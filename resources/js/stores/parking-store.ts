import React from 'react';
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  ParkingSlot,
  ParkingSession,
  ParkingNotification,
  ParkingAreaUpdate,
  useParkingWebSocket
} from '@/services/parking-websocket';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface SearchFilters {
  maxDistance: number; // in meters
  maxPrice: number; // per hour
  availableOnly: boolean;
  sortBy: 'distance' | 'price' | 'rating';
}

export interface ParkingArea {
  id: string;
  name: string;
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  slots: ParkingSlot[];
  lastUpdated: string;
}

interface ParkingState {
  // Location and search
  userLocation: UserLocation | null;
  searchFilters: SearchFilters;
  isLocationLoading: boolean;
  locationError: string | null;

  // Parking areas and slots
  areas: Map<string, ParkingArea>;
  visibleSlots: ParkingSlot[];
  selectedSlot: ParkingSlot | null;
  nearbySlots: ParkingSlot[];

  // User sessions
  activeSessions: ParkingSession[];
  sessionHistory: ParkingSession[];
  currentSession: ParkingSession | null;

  // Notifications
  notifications: ParkingNotification[];
  unreadNotificationCount: number;

  // Real-time state
  isOnline: boolean;
  lastSyncTimestamp: number;
  pendingUpdates: number;

  // Loading states
  isLoadingSlots: boolean;
  isLoadingSessions: boolean;
  error: string | null;
}

interface ParkingActions {
  // Location management
  setUserLocation: (location: UserLocation) => void;
  requestLocation: () => Promise<void>;
  updateSearchFilters: (filters: Partial<SearchFilters>) => void;

  // Slot management
  updateSlotStatus: (slotId: string, status: ParkingSlot['status']) => void;
  setSelectedSlot: (slot: ParkingSlot | null) => void;
  updateArea: (update: ParkingAreaUpdate) => void;
  loadNearbySlots: (location: UserLocation, radius?: number) => Promise<void>;

  // Session management
  createSession: (session: ParkingSession) => void;
  updateSession: (sessionId: string, updates: Partial<ParkingSession>) => void;
  setCurrentSession: (session: ParkingSession | null) => void;
  loadActiveSessions: () => Promise<void>;

  // Notifications
  addNotification: (notification: ParkingNotification) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;

  // Real-time updates
  handleRealTimeUpdate: (eventType: string, data: any) => void;
  syncWithServer: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

type ParkingStore = ParkingState & ParkingActions;

const initialState: ParkingState = {
  userLocation: null,
  searchFilters: {
    maxDistance: 1000, // 1km
    maxPrice: 50, // $50/hour
    availableOnly: true,
    sortBy: 'distance'
  },
  isLocationLoading: false,
  locationError: null,

  areas: new Map(),
  visibleSlots: [],
  selectedSlot: null,
  nearbySlots: [],

  activeSessions: [],
  sessionHistory: [],
  currentSession: null,

  notifications: [],
  unreadNotificationCount: 0,

  isOnline: navigator.onLine,
  lastSyncTimestamp: Date.now(),
  pendingUpdates: 0,

  isLoadingSlots: false,
  isLoadingSessions: false,
  error: null
};

export const useParkingStore = create<ParkingStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Location management
        setUserLocation: (location) => {
          set((state) => {
            state.userLocation = location;
            state.isLocationLoading = false;
            state.locationError = null;
          });
        },

        requestLocation: async () => {
          set((state) => {
            state.isLocationLoading = true;
            state.locationError = null;
          });

          try {
            if (!navigator.geolocation) {
              throw new Error('Geolocation is not supported by this browser');
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 300000 // 5 minutes
                }
              );
            });

            const location: UserLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now()
            };

            get().setUserLocation(location);

            // Auto-load nearby slots
            await get().loadNearbySlots(location);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
            set((state) => {
              state.isLocationLoading = false;
              state.locationError = errorMessage;
            });
            throw error;
          }
        },

        updateSearchFilters: (filters) => {
          set((state) => {
            Object.assign(state.searchFilters, filters);
          });

          // Re-filter visible slots
          const { userLocation } = get();
          if (userLocation) {
            get().loadNearbySlots(userLocation);
          }
        },

        // Slot management
        updateSlotStatus: (slotId, status) => {
          set((state) => {
            // Update in all areas
            state.areas.forEach((area) => {
              const slot = area.slots.find(s => s.id === slotId);
              if (slot) {
                slot.status = status;
                slot.updated_at = new Date().toISOString();
              }
            });

            // Update visible slots
            const visibleSlot = state.visibleSlots.find(s => s.id === slotId);
            if (visibleSlot) {
              visibleSlot.status = status;
              visibleSlot.updated_at = new Date().toISOString();
            }

            // Update nearby slots
            const nearbySlot = state.nearbySlots.find(s => s.id === slotId);
            if (nearbySlot) {
              nearbySlot.status = status;
              nearbySlot.updated_at = new Date().toISOString();
            }

            // Update selected slot
            if (state.selectedSlot?.id === slotId) {
              state.selectedSlot.status = status;
              state.selectedSlot.updated_at = new Date().toISOString();
            }
          });
        },

        setSelectedSlot: (slot) => {
          set((state) => {
            state.selectedSlot = slot;
          });
        },

        updateArea: (update) => {
          set((state) => {
            const existingArea = state.areas.get(update.area_id);
            if (existingArea) {
              existingArea.slots = update.slots;
              existingArea.lastUpdated = update.updated_at;
            } else {
              // Create new area (this shouldn't normally happen)
              const newArea: ParkingArea = {
                id: update.area_id,
                name: `Area ${update.area_id}`,
                bounds: {
                  northeast: { lat: 0, lng: 0 },
                  southwest: { lat: 0, lng: 0 }
                },
                slots: update.slots,
                lastUpdated: update.updated_at
              };
              state.areas.set(update.area_id, newArea);
            }

            // Update visible slots if this area is currently visible
            state.visibleSlots = Array.from(state.areas.values())
              .flatMap((area: ParkingArea) => area.slots)
              .filter((slot: ParkingSlot) => {
                if (state.searchFilters.availableOnly && slot.status !== 'available') {
                  return false;
                }
                return true;
              });

            state.lastSyncTimestamp = Date.now();
          });
        },

        loadNearbySlots: async (location, radius = 1000) => {
          set((state) => {
            state.isLoadingSlots = true;
            state.error = null;
          });

          try {
            const response = await fetch('/api/parking-slots/nearby', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              },
              body: JSON.stringify({
                latitude: location.latitude,
                longitude: location.longitude,
                radius,
                filters: get().searchFilters
              })
            });

            if (!response.ok) {
              throw new Error(`Failed to load nearby slots: ${response.status}`);
            }

            const data = await response.json();

            set((state) => {
              state.nearbySlots = data.slots || [];
              state.visibleSlots = data.slots || [];
              state.isLoadingSlots = false;

              // Update areas map
              if (data.areas) {
                (data.areas as ParkingArea[]).forEach((area: ParkingArea) => {
                  state.areas.set(area.id, area);
                });
              }
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load slots';
            set((state) => {
              state.isLoadingSlots = false;
              state.error = errorMessage;
            });
            throw error;
          }
        },

        // Session management
        createSession: (session) => {
          set((state) => {
            state.activeSessions.push(session);
            state.currentSession = session;

            // Update slot status to reserved/occupied
            get().updateSlotStatus(session.parking_slot_id, 'reserved');
          });
        },

        updateSession: (sessionId, updates) => {
          set((state) => {
            const activeIndex = state.activeSessions.findIndex((s: ParkingSession) => s.id === sessionId);
            if (activeIndex !== -1) {
              Object.assign(state.activeSessions[activeIndex], updates);
            }

            if (state.currentSession?.id === sessionId) {
              Object.assign(state.currentSession, updates);
            }

            // Update slot status based on session status
            if (updates.status) {
              const session = state.activeSessions.find((s: ParkingSession) => s.id === sessionId) || state.currentSession;
              if (session) {
                let slotStatus: ParkingSlot['status'] = 'available';
                switch (updates.status) {
                  case 'active':
                    slotStatus = 'occupied';
                    break;
                  case 'pending':
                    slotStatus = 'reserved';
                    break;
                  case 'completed':
                  case 'cancelled':
                  case 'expired':
                    slotStatus = 'available';
                    break;
                }
                get().updateSlotStatus(session.parking_slot_id, slotStatus);
              }
            }
          });
        },

        setCurrentSession: (session) => {
          set((state) => {
            state.currentSession = session;
          });
        },

        loadActiveSessions: async () => {
          set((state) => {
            state.isLoadingSessions = true;
            state.error = null;
          });

          try {
            const response = await fetch('/api/parking-sessions/active', {
              headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });

            if (!response.ok) {
              throw new Error(`Failed to load sessions: ${response.status}`);
            }

            const data = await response.json();

            set((state) => {
              state.activeSessions = data.sessions || [];
              state.currentSession = data.current_session || null;
              state.isLoadingSessions = false;
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load sessions';
            set((state) => {
              state.isLoadingSessions = false;
              state.error = errorMessage;
            });
            throw error;
          }
        },

        // Notifications
        addNotification: (notification) => {
          set((state) => {
            state.notifications.unshift(notification);
            state.unreadNotificationCount += 1;

            // Limit notifications to last 50
            if (state.notifications.length > 50) {
              state.notifications = state.notifications.slice(0, 50);
            }
          });
        },

        markNotificationRead: (notificationId) => {
          set((state) => {
            const notification = state.notifications.find((n: ParkingNotification) => n.id === notificationId);
            if (notification && !notification.read) {
              notification.read = true;
              state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
            }
          });
        },

        clearNotifications: () => {
          set((state) => {
            state.notifications = [];
            state.unreadNotificationCount = 0;
          });
        },

        // Real-time updates
        handleRealTimeUpdate: (eventType, data) => {
          console.log('[ParkingStore] Real-time update:', eventType, data);

          switch (eventType) {
            case 'slot.status.changed':
              get().updateSlotStatus(data.slot_id, data.new_status);
              break;

            case 'session.created':
              get().createSession(data.session);
              break;

            case 'session.updated':
              get().updateSession(data.session.id, data.changes);
              break;

            case 'session.expiry.warning':
              get().addNotification({
                id: `expiry-${data.session.id}`,
                type: 'expiry_warning',
                title: 'Parking Expires Soon',
                message: `Your parking expires in ${data.minutes_remaining} minutes`,
                data: { session_id: data.session.id, minutes_remaining: data.minutes_remaining }
              });
              break;

            case 'area.updated':
              get().updateArea(data);
              break;

            case 'notification.new':
              get().addNotification(data);
              break;

            case 'payment.required':
              get().addNotification({
                id: `payment-${data.session_id}`,
                type: 'payment_required',
                title: 'Payment Required',
                message: `Payment of $${data.amount} is due`,
                data: { session_id: data.session_id, amount: data.amount, due_at: data.due_at }
              });
              break;
          }
        },

        syncWithServer: async () => {
          try {
            const { userLocation } = get();
            if (userLocation) {
              await get().loadNearbySlots(userLocation);
            }
            await get().loadActiveSessions();

            set((state) => {
              state.lastSyncTimestamp = Date.now();
            });

          } catch (error) {
            console.error('[ParkingStore] Sync failed:', error);
          }
        },

        setOnlineStatus: (online) => {
          set((state) => {
            state.isOnline = online;
          });

          if (online) {
            // Trigger sync when coming back online
            get().syncWithServer();
          }
        },

        // Utility actions
        clearError: () => {
          set((state) => {
            state.error = null;
            state.locationError = null;
          });
        },

        reset: () => {
          set((state) => {
            Object.assign(state, initialState);
            state.areas = new Map();
          });
        }
      }))
    ),
    { name: 'parking-store' }
  )
);

// Hook for WebSocket integration with the store
export function useParkingStoreWithWebSocket(userId?: string) {
  const store = useParkingStore();
  const ws = useParkingWebSocket(userId);

  // Subscribe to real-time events
  React.useEffect(() => {
    const unsubscribers = [
      ws.subscribeToEvent('slot.status.changed', (data) =>
        store.handleRealTimeUpdate('slot.status.changed', data)
      ),
      ws.subscribeToEvent('session.created', (data) =>
        store.handleRealTimeUpdate('session.created', data)
      ),
      ws.subscribeToEvent('session.updated', (data) =>
        store.handleRealTimeUpdate('session.updated', data)
      ),
      ws.subscribeToEvent('session.expiry.warning', (data) =>
        store.handleRealTimeUpdate('session.expiry.warning', data)
      ),
      ws.subscribeToEvent('area.updated', (data) =>
        store.handleRealTimeUpdate('area.updated', data)
      ),
      ws.subscribeToEvent('notification.new', (data) =>
        store.handleRealTimeUpdate('notification.new', data)
      ),
      ws.subscribeToEvent('payment.required', (data) =>
        store.handleRealTimeUpdate('payment.required', data)
      )
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [ws, store]);

  // Handle connection state changes
  React.useEffect(() => {
    store.setOnlineStatus(ws.isConnected);
  }, [ws.isConnected, store]);

  return {
    ...store,
    websocket: ws
  };
}