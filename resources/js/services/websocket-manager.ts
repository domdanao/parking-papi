import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  maxReconnectAttempts?: number;
  binaryType?: BinaryType;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  enableFallbackPolling?: boolean;
  fallbackPollingInterval?: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
}

export interface QueuedMessage {
  message: WebSocketMessage;
  timestamp: number;
  retries: number;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;
  private messageQueue: QueuedMessage[] = [];
  private listeners = new Map<string, Set<(data: any) => void>>();
  private stateListeners = new Set<(state: ConnectionState) => void>();
  private currentState: ConnectionState = 'disconnected';
  private isVisible = true;
  private networkOnline = true;
  private batteryOptimization = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      maxReconnectAttempts: Infinity,
      binaryType: 'blob',
      enableHeartbeat: true,
      heartbeatInterval: 30000,
      enableFallbackPolling: true,
      fallbackPollingInterval: 60000,
      protocols: [],
      ...config,
    };

    this.setupEventListeners();
    this.setupNetworkMonitoring();
    this.setupVisibilityHandling();
    this.setupBatteryOptimization();
  }

  private setupEventListeners() {
    // Page visibility handling
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Network status monitoring
    window.addEventListener('online', this.handleNetworkOnline.bind(this));
    window.addEventListener('offline', this.handleNetworkOffline.bind(this));

    // App lifecycle (mobile PWA)
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('pagehide', this.handlePageHide.bind(this));
    window.addEventListener('pageshow', this.handlePageShow.bind(this));
  }

  private setupNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', this.handleConnectionChange.bind(this));
      }
    }
  }

  private setupVisibilityHandling() {
    this.isVisible = !document.hidden;
  }

  private async setupBatteryOptimization() {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryOptimization = battery.level < 0.2; // Enable when battery < 20%

        battery.addEventListener('levelchange', () => {
          this.batteryOptimization = battery.level < 0.2;
          this.adjustHeartbeatInterval();
        });
      } catch (error) {
        console.log('Battery API not available');
      }
    }
  }

  private adjustHeartbeatInterval() {
    if (this.batteryOptimization) {
      // Reduce heartbeat frequency when battery is low
      this.config.heartbeatInterval = 60000; // 1 minute
    } else if (!this.isVisible) {
      // Reduce frequency when app is in background
      this.config.heartbeatInterval = 45000; // 45 seconds
    } else {
      // Normal frequency when app is active
      this.config.heartbeatInterval = 30000; // 30 seconds
    }

    this.restartHeartbeat();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setState('connecting');

      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);
        this.ws.binaryType = this.config.binaryType;

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected successfully');
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.processMessageQueue();
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
          this.setState('failed');
          reject(error);
        };

      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error);
        this.setState('failed');
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle heartbeat responses
      if (message.type === 'heartbeat' || message.type === 'pong') {
        this.lastHeartbeat = Date.now();
        return;
      }

      // Emit to registered listeners
      const listeners = this.listeners.get(message.type);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            console.error('[WebSocket] Error in message handler:', error);
          }
        });
      }

      // Emit to catch-all listeners
      const allListeners = this.listeners.get('*');
      if (allListeners) {
        allListeners.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('[WebSocket] Error in catch-all handler:', error);
          }
        });
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('[WebSocket] Connection closed:', event.code, event.reason);
    this.stopHeartbeat();

    if (event.code === 1000) {
      // Normal closure
      this.setState('disconnected');
    } else {
      // Abnormal closure - attempt reconnect
      this.setState('reconnecting');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      this.setState('failed');
      this.startFallbackPolling();
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectInterval
    );

    const jitter = delay * 0.1 * Math.random();
    const finalDelay = delay + jitter;

    console.log(`[WebSocket] Reconnecting in ${finalDelay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {
        // Will be handled by scheduleReconnect in onclose
      });
    }, finalDelay);
  }

  private startHeartbeat() {
    if (!this.config.enableHeartbeat) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        });

        // Check if we've received a heartbeat response recently
        if (Date.now() - this.lastHeartbeat > this.config.heartbeatInterval * 2) {
          console.warn('[WebSocket] Heartbeat timeout, reconnecting...');
          this.ws.close();
        }
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private restartHeartbeat() {
    this.stopHeartbeat();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.startHeartbeat();
    }
  }

  private startFallbackPolling() {
    if (!this.config.enableFallbackPolling) return;

    console.log('[WebSocket] Starting fallback polling mode');

    this.fallbackTimer = setInterval(() => {
      // Emit a polling event for listeners to handle
      this.emitToListeners('polling', { timestamp: Date.now() });
    }, this.config.fallbackPollingInterval);
  }

  private stopFallbackPolling() {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  send(message: WebSocketMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        this.queueMessage(message);
        return false;
      }
    } else {
      this.queueMessage(message);
      return false;
    }
  }

  private queueMessage(message: WebSocketMessage) {
    const queuedMessage: QueuedMessage = {
      message,
      timestamp: Date.now(),
      retries: 0
    };

    this.messageQueue.push(queuedMessage);

    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  private processMessageQueue() {
    const processedMessages: QueuedMessage[] = [];

    for (const queuedMessage of this.messageQueue) {
      if (this.send(queuedMessage.message)) {
        processedMessages.push(queuedMessage);
      } else {
        queuedMessage.retries++;
        if (queuedMessage.retries >= 3) {
          console.warn('[WebSocket] Dropping message after 3 failed attempts:', queuedMessage.message);
          processedMessages.push(queuedMessage);
        }
      }
    }

    // Remove processed messages from queue
    this.messageQueue = this.messageQueue.filter(msg => !processedMessages.includes(msg));
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  onStateChange(callback: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(callback);

    // Immediately call with current state
    callback(this.currentState);

    return () => {
      this.stateListeners.delete(callback);
    };
  }

  private setState(state: ConnectionState) {
    if (this.currentState !== state) {
      this.currentState = state;
      this.stateListeners.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error('[WebSocket] Error in state change handler:', error);
        }
      });
    }
  }

  private emitToListeners(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WebSocket] Error in listener:', error);
        }
      });
    }
  }

  // Event handlers for mobile PWA lifecycle
  private handleVisibilityChange() {
    this.isVisible = !document.hidden;

    if (this.isVisible) {
      console.log('[WebSocket] App became visible, reconnecting if needed');
      if (this.currentState === 'disconnected' || this.currentState === 'failed') {
        this.connect().catch(console.error);
      }
    } else {
      console.log('[WebSocket] App became hidden, adjusting behavior');
    }

    this.adjustHeartbeatInterval();
  }

  private handleNetworkOnline() {
    console.log('[WebSocket] Network came online');
    this.networkOnline = true;
    this.stopFallbackPolling();

    if (this.currentState !== 'connected') {
      this.connect().catch(console.error);
    }
  }

  private handleNetworkOffline() {
    console.log('[WebSocket] Network went offline');
    this.networkOnline = false;
    this.setState('disconnected');
    this.startFallbackPolling();
  }

  private handleConnectionChange() {
    const connection = (navigator as any).connection;
    if (connection) {
      console.log('[WebSocket] Connection changed:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });

      // Adjust behavior based on connection quality
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.config.heartbeatInterval = 60000; // Reduce heartbeat frequency
        this.restartHeartbeat();
      }
    }
  }

  private handleBeforeUnload() {
    this.disconnect();
  }

  private handlePageHide() {
    // iOS Safari specific - connection might be suspended
    this.adjustHeartbeatInterval();
  }

  private handlePageShow() {
    // Check if we need to reconnect after being suspended
    if (this.currentState === 'connected' && this.ws?.readyState !== WebSocket.OPEN) {
      console.log('[WebSocket] Connection lost while suspended, reconnecting...');
      this.connect().catch(console.error);
    }
  }

  disconnect() {
    console.log('[WebSocket] Disconnecting...');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();
    this.stopFallbackPolling();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
  }

  getState(): ConnectionState {
    return this.currentState;
  }

  isConnected(): boolean {
    return this.currentState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }
}

// React hook for easy integration
export function useWebSocket(config: WebSocketConfig) {
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    wsManagerRef.current = new WebSocketManager(config);

    const unsubscribeState = wsManagerRef.current.onStateChange(setConnectionState);

    // Update queue size periodically
    const queueTimer = setInterval(() => {
      if (wsManagerRef.current) {
        setQueueSize(wsManagerRef.current.getQueueSize());
      }
    }, 1000);

    // Auto-connect
    wsManagerRef.current.connect().catch(console.error);

    return () => {
      unsubscribeState();
      clearInterval(queueTimer);
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
    };
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    return wsManagerRef.current?.send(message) ?? false;
  }, []);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    return wsManagerRef.current?.subscribe(eventType, callback) ?? (() => {});
  }, []);

  const connect = useCallback(() => {
    return wsManagerRef.current?.connect() ?? Promise.reject('WebSocket not initialized');
  }, []);

  const disconnect = useCallback(() => {
    wsManagerRef.current?.disconnect();
  }, []);

  return {
    connectionState,
    queueSize,
    send,
    subscribe,
    connect,
    disconnect,
    isConnected: connectionState === 'connected'
  };
}

export default WebSocketManager;