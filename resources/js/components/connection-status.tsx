import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Cloud, CloudOff, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { ConnectionState } from '@/services/websocket-manager';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  queueSize?: number;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export function ConnectionStatus({
  connectionState,
  queueSize = 0,
  onRetry,
  className,
  compact = false
}: ConnectionStatusProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: navigator.onLine
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => setNetworkStatus(prev => ({ ...prev, online: true }));
    const handleOffline = () => setNetworkStatus(prev => ({ ...prev, online: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection quality if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const updateConnection = () => {
          setNetworkStatus(prev => ({
            ...prev,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          }));
        };

        connection.addEventListener('change', updateConnection);
        updateConnection(); // Initial reading

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          connection.removeEventListener('change', updateConnection);
        };
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show status indicator when connection is not optimal
  useEffect(() => {
    const shouldShow =
      !networkStatus.online ||
      connectionState === 'disconnected' ||
      connectionState === 'reconnecting' ||
      connectionState === 'failed' ||
      queueSize > 0;

    setIsVisible(shouldShow);
  }, [networkStatus.online, connectionState, queueSize]);

  const getStatusInfo = () => {
    if (!networkStatus.online) {
      return {
        icon: WifiOff,
        label: 'No Internet',
        description: 'You are currently offline',
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50'
      };
    }

    switch (connectionState) {
      case 'connecting':
        return {
          icon: Loader2,
          label: 'Connecting',
          description: 'Establishing connection...',
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          animate: true
        };

      case 'connected':
        if (queueSize > 0) {
          return {
            icon: Cloud,
            label: 'Syncing',
            description: `${queueSize} pending updates`,
            color: 'bg-yellow-500',
            textColor: 'text-yellow-700',
            bgColor: 'bg-yellow-50'
          };
        }
        return {
          icon: Wifi,
          label: 'Connected',
          description: 'Real-time updates active',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50'
        };

      case 'reconnecting':
        return {
          icon: RefreshCw,
          label: 'Reconnecting',
          description: 'Attempting to reconnect...',
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          animate: true
        };

      case 'disconnected':
        return {
          icon: CloudOff,
          label: 'Disconnected',
          description: 'Using cached data',
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50'
        };

      case 'failed':
        return {
          icon: CloudOff,
          label: 'Connection Failed',
          description: 'Tap to retry',
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50'
        };

      default:
        return {
          icon: WifiOff,
          label: 'Unknown',
          description: 'Connection status unknown',
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  if (!isVisible && connectionState === 'connected' && queueSize === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('flex items-center justify-center w-2 h-2 rounded-full', statusInfo.color)} />
        <IconComponent
          className={cn(
            'w-4 h-4',
            statusInfo.textColor,
            statusInfo.animate && 'animate-spin'
          )}
        />
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'fixed top-0 left-0 right-0 z-50 border-b shadow-sm',
            statusInfo.bgColor,
            className
          )}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('flex items-center justify-center w-6 h-6 rounded-full', statusInfo.color)}>
                  <IconComponent
                    className={cn(
                      'w-3.5 h-3.5 text-white',
                      statusInfo.animate && 'animate-spin'
                    )}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className={cn('font-medium text-sm', statusInfo.textColor)}>
                    {statusInfo.label}
                  </span>
                  <span className={cn('text-xs opacity-80', statusInfo.textColor)}>
                    {statusInfo.description}
                  </span>
                </div>

                {/* Network quality indicator */}
                {networkStatus.online && networkStatus.effectiveType && (
                  <div className="hidden sm:flex items-center gap-2 text-xs opacity-60">
                    <span>•</span>
                    <span className="capitalize">{networkStatus.effectiveType}</span>
                    {networkStatus.downlink && (
                      <>
                        <span>•</span>
                        <span>{networkStatus.downlink.toFixed(1)} Mbps</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {queueSize > 0 && (
                  <div className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    'bg-white/20 text-current'
                  )}>
                    {queueSize}
                  </div>
                )}

                {(connectionState === 'failed' || connectionState === 'disconnected') && onRetry && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRetry}
                    className={cn(
                      'h-8 px-3 text-xs',
                      statusInfo.textColor,
                      'hover:bg-white/20'
                    )}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>

            {/* Progressive Web App offline notice */}
            {!networkStatus.online && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 pt-2 border-t border-current/20"
              >
                <p className={cn('text-xs', statusInfo.textColor)}>
                  You can continue using the app with cached data.
                  Some features may be limited until connection is restored.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for accessing connection status in components
export function useConnectionStatus() {
  const [networkStatus, setNetworkStatus] = useState({
    online: navigator.onLine,
    effectiveType: undefined as string | undefined,
    downlink: undefined as number | undefined,
    rtt: undefined as number | undefined
  });

  useEffect(() => {
    const handleOnline = () => setNetworkStatus(prev => ({ ...prev, online: true }));
    const handleOffline = () => setNetworkStatus(prev => ({ ...prev, online: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const updateConnection = () => {
          setNetworkStatus(prev => ({
            ...prev,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          }));
        };

        connection.addEventListener('change', updateConnection);
        updateConnection();

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          connection.removeEventListener('change', updateConnection);
        };
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return networkStatus;
}