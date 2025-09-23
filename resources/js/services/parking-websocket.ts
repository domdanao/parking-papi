import { useCallback, useEffect, useState } from 'react';
import { useWebSocket, WebSocketMessage } from './websocket-manager';

export interface ParkingSlot {
  id: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  location: {
    latitude: number;
    longitude: number;
  };
  base_hourly_rate: number;
  updated_at: string;
}

export interface ParkingSession {
  id: string;
  user_id: string;
  parking_slot_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'expired';
  confirmation_code: string;
  start_time: string;
  end_time?: string;
  expires_at: string;
  amount: number;
}

export interface ParkingNotification {
  id: string;
  type: 'expiry_warning' | 'session_started' | 'session_ended' | 'payment_required' | 'slot_unavailable';
  title: string;
  message: string;
  data?: any;
  expires_at?: string;
  read?: boolean;
}

export interface ParkingAreaUpdate {
  area_id: string;
  slots: ParkingSlot[];
  updated_at: string;
}

export type ParkingEventType =
  | 'slot.status.changed'
  | 'session.created'
  | 'session.updated'
  | 'session.expiry.warning'
  | 'area.updated'
  | 'notification.new'
  | 'payment.required'
  | 'sync.request';

export interface ParkingWebSocketEvents {
  'slot.status.changed': {
    slot_id: string;
    old_status: string;
    new_status: string;
    slot: ParkingSlot;
  };
  'session.created': {
    session: ParkingSession;
  };
  'session.updated': {
    session: ParkingSession;
    changes: Partial<ParkingSession>;
  };
  'session.expiry.warning': {
    session: ParkingSession;
    minutes_remaining: number;
  };
  'area.updated': ParkingAreaUpdate;
  'notification.new': ParkingNotification;
  'payment.required': {
    session_id: string;
    amount: number;
    due_at: string;
  };
  'sync.request': {
    timestamp: string;
  };
}

class ParkingWebSocketService {
  private wsConfig: any;
  private userId?: string;
  private subscribedAreas = new Set<string>();
  private lastSyncTimestamp = Date.now();

  constructor() {
    // Get WebSocket URL from Laravel config
    const wsUrl = this.getWebSocketUrl();

    this.wsConfig = {
      url: wsUrl,
      enableHeartbeat: true,
      heartbeatInterval: 30000,
      enableFallbackPolling: true,
      fallbackPollingInterval: 45000, // Shorter for parking critical data
      maxReconnectAttempts: Infinity,
    };
  }

  private getWebSocketUrl(): string {
    // Use Laravel Reverb WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    // In development, Laravel Reverb typically runs on port 8080
    if (host.includes('localhost') || host.includes('.test')) {
      return `${protocol}//${host.split(':')[0]}:8080/app/parking-platform?protocol=7&client=js&version=8.0.0&flash=false`;
    }

    // Production URL
    return `${protocol}//${host}/ws/app/parking-platform?protocol=7&client=js&version=8.0.0&flash=false`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  subscribeToArea(areaId: string, ws: any) {
    if (this.subscribedAreas.has(areaId)) {
      return;
    }

    console.log(`[ParkingWS] Subscribing to area: ${areaId}`);

    const subscribeMessage: WebSocketMessage = {
      type: 'pusher:subscribe',
      data: {
        channel: `parking-area-${areaId}`
      },
      timestamp: Date.now()
    };

    ws.send(subscribeMessage);
    this.subscribedAreas.add(areaId);
  }

  unsubscribeFromArea(areaId: string, ws: any) {
    if (!this.subscribedAreas.has(areaId)) {
      return;
    }

    console.log(`[ParkingWS] Unsubscribing from area: ${areaId}`);

    const unsubscribeMessage: WebSocketMessage = {
      type: 'pusher:unsubscribe',
      data: {
        channel: `parking-area-${areaId}`
      },
      timestamp: Date.now()
    };

    ws.send(unsubscribeMessage);
    this.subscribedAreas.delete(areaId);
  }

  subscribeToUserChannel(ws: any) {
    if (!this.userId) {
      console.warn('[ParkingWS] Cannot subscribe to user channel - no user ID set');
      return;
    }

    console.log(`[ParkingWS] Subscribing to user channel: ${this.userId}`);

    const subscribeMessage: WebSocketMessage = {
      type: 'pusher:subscribe',
      data: {
        channel: `private-user.${this.userId}`,
        auth: this.getAuthSignature()
      },
      timestamp: Date.now()
    };

    ws.send(subscribeMessage);
  }

  private getAuthSignature(): string {
    // Get CSRF token and create auth signature for private channels
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!token) {
      console.error('[ParkingWS] CSRF token not found');
      return '';
    }

    // This would typically be handled by Laravel Echo, but we're implementing manually
    // In production, you'd make an API call to get the proper signature
    return `${this.userId}:${token}`;
  }

  requestSync(ws: any) {
    console.log('[ParkingWS] Requesting data sync');

    const syncMessage: WebSocketMessage = {
      type: 'sync.request',
      data: {
        last_sync: this.lastSyncTimestamp,
        areas: Array.from(this.subscribedAreas),
        user_id: this.userId
      },
      timestamp: Date.now()
    };

    ws.send(syncMessage);
  }

  markSynced() {
    this.lastSyncTimestamp = Date.now();
  }

  // Fallback polling handler
  async handlePollingFallback(): Promise<void> {
    if (!this.userId) return;

    try {
      console.log('[ParkingWS] Executing fallback polling');

      // Fetch critical updates via REST API
      const responses = await Promise.all([
        this.fetchUserSessions(),
        this.fetchSubscribedAreaUpdates(),
        this.fetchPendingNotifications()
      ]);

      const [sessions, areaUpdates, notifications] = responses;

      // Emit updates as if they came from WebSocket
      if (sessions.length > 0) {
        sessions.forEach(session => {
          this.emitPollingEvent('session.updated', { session, changes: {} });
        });
      }

      if (areaUpdates.length > 0) {
        areaUpdates.forEach(update => {
          this.emitPollingEvent('area.updated', update);
        });
      }

      if (notifications.length > 0) {
        notifications.forEach(notification => {
          this.emitPollingEvent('notification.new', notification);
        });
      }

    } catch (error) {
      console.error('[ParkingWS] Fallback polling failed:', error);
    }
  }

  private async fetchUserSessions(): Promise<ParkingSession[]> {
    const response = await fetch('/api/parking-sessions/active', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }

    const data = await response.json();
    return data.sessions || [];
  }

  private async fetchSubscribedAreaUpdates(): Promise<ParkingAreaUpdate[]> {
    if (this.subscribedAreas.size === 0) return [];

    const areaIds = Array.from(this.subscribedAreas).join(',');
    const response = await fetch(`/api/parking-areas/updates?areas=${areaIds}&since=${this.lastSyncTimestamp}`, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch area updates: ${response.status}`);
    }

    const data = await response.json();
    return data.updates || [];
  }

  private async fetchPendingNotifications(): Promise<ParkingNotification[]> {
    const response = await fetch(`/api/notifications/pending?since=${this.lastSyncTimestamp}`, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    const data = await response.json();
    return data.notifications || [];
  }

  private emitPollingEvent(eventType: string, data: any) {
    // This would emit to the WebSocket manager's listeners
    window.dispatchEvent(new CustomEvent('parking-polling-update', {
      detail: { type: eventType, data }
    }));
  }
}

// React hook for parking WebSocket functionality
export function useParkingWebSocket(userId?: string) {
  const [parkingService] = useState(() => new ParkingWebSocketService());
  const [subscribedAreas, setSubscribedAreas] = useState<Set<string>>(new Set());

  const ws = useWebSocket(parkingService['wsConfig']);

  useEffect(() => {
    if (userId) {
      parkingService.setUserId(userId);
      if (ws.isConnected) {
        parkingService.subscribeToUserChannel(ws);
      }
    }
  }, [userId, ws.isConnected]);

  // Handle fallback polling
  useEffect(() => {
    const handlePolling = () => {
      parkingService.handlePollingFallback();
    };

    const unsubscribe = ws.subscribe('polling', handlePolling);
    return unsubscribe;
  }, [ws.subscribe]);

  // Handle custom polling events
  useEffect(() => {
    const handlePollingUpdate = (event: CustomEvent) => {
      const { type, data } = event.detail;
      // Re-emit through WebSocket system
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { type, data }
      }));
    };

    window.addEventListener('parking-polling-update', handlePollingUpdate as EventListener);
    return () => {
      window.removeEventListener('parking-polling-update', handlePollingUpdate as EventListener);
    };
  }, []);

  const subscribeToArea = useCallback((areaId: string) => {
    if (ws.isConnected) {
      parkingService.subscribeToArea(areaId, ws);
      setSubscribedAreas(prev => new Set([...prev, areaId]));
    }
  }, [ws.isConnected, ws]);

  const unsubscribeFromArea = useCallback((areaId: string) => {
    if (ws.isConnected) {
      parkingService.unsubscribeFromArea(areaId, ws);
      setSubscribedAreas(prev => {
        const newSet = new Set(prev);
        newSet.delete(areaId);
        return newSet;
      });
    }
  }, [ws.isConnected, ws]);

  const subscribeToEvent = useCallback(<T extends ParkingEventType>(
    eventType: T,
    callback: (data: ParkingWebSocketEvents[T]) => void
  ) => {
    return ws.subscribe(eventType, callback);
  }, [ws.subscribe]);

  const requestSync = useCallback(() => {
    if (ws.isConnected) {
      parkingService.requestSync(ws);
    } else {
      // Trigger immediate polling fallback
      parkingService.handlePollingFallback();
    }
  }, [ws.isConnected, ws]);

  return {
    connectionState: ws.connectionState,
    isConnected: ws.isConnected,
    queueSize: ws.queueSize,
    subscribedAreas: Array.from(subscribedAreas),
    subscribeToArea,
    unsubscribeFromArea,
    subscribeToEvent,
    requestSync,
    connect: ws.connect,
    disconnect: ws.disconnect
  };
}

export default ParkingWebSocketService;