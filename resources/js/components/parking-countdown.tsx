import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, CheckCircle, XCircle, Plus, Car, MapPin } from 'lucide-react';
import { useParkingStore } from '@/providers/parking-provider';

interface ParkingSession {
  id: string;
  parking_slot_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'expired';
  confirmation_code: string;
  start_time?: string;
  end_time?: string;
  expires_at: string;
  amount: number;
  slot?: {
    id: string;
    description?: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
}

interface CountdownTimerProps {
  session: ParkingSession;
  onExtend?: (sessionId: string, additionalHours: number) => void;
  onEnd?: (sessionId: string) => void;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export function ParkingCountdown({ session, onExtend, onEnd, className }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [showExtendOptions, setShowExtendOptions] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  // Calculate time remaining
  const calculateTimeRemaining = useCallback((): TimeRemaining => {
    const now = new Date().getTime();
    const expiryTime = new Date(session.expires_at).getTime();
    const diffSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

    const isExpired = diffSeconds <= 0;
    const days = Math.floor(diffSeconds / (24 * 60 * 60));
    const hours = Math.floor((diffSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((diffSeconds % (60 * 60)) / 60);
    const seconds = diffSeconds % 60;

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds: diffSeconds,
      isExpired
    };
  }, [session.expires_at]);

  // Update countdown every second
  useEffect(() => {
    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Trigger warnings and notifications
      if (remaining.totalSeconds === 900) { // 15 minutes
        showNotification('Parking expires in 15 minutes!', 'warning');
      } else if (remaining.totalSeconds === 300) { // 5 minutes
        showNotification('Parking expires in 5 minutes!', 'urgent');
      } else if (remaining.totalSeconds === 0) {
        showNotification('Parking has expired!', 'expired');
        onEnd?.(session.id);
      }
    };

    // Initial calculation
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session.expires_at, session.id, calculateTimeRemaining, onEnd]);

  const showNotification = (message: string, type: 'warning' | 'urgent' | 'expired') => {
    // Create browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Parking Platform', {
        body: message,
        icon: '/favicon.ico',
        tag: `parking-${session.id}`,
        requireInteraction: type === 'expired',
      });
    }

    // Vibrate on mobile
    if ('vibrate' in navigator) {
      const vibrationPattern = type === 'expired' ? [200, 100, 200] : [100];
      navigator.vibrate(vibrationPattern);
    }
  };

  const handleExtendSession = async (additionalHours: number) => {
    if (!onExtend) return;

    setIsExtending(true);
    try {
      await onExtend(session.id, additionalHours);
      setShowExtendOptions(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const getStatusColor = () => {
    if (session.status === 'expired' || timeRemaining?.isExpired) return 'destructive';
    if (session.status === 'completed') return 'default';
    if (timeRemaining && timeRemaining.totalSeconds <= 300) return 'destructive'; // 5 minutes
    if (timeRemaining && timeRemaining.totalSeconds <= 900) return 'secondary'; // 15 minutes
    return 'default';
  };

  const getTimeDisplay = () => {
    if (!timeRemaining) return '--:--:--';

    if (timeRemaining.isExpired) {
      return 'EXPIRED';
    }

    const parts = [];
    if (timeRemaining.days > 0) parts.push(`${timeRemaining.days}d`);
    if (timeRemaining.hours > 0) parts.push(`${timeRemaining.hours}h`);
    if (timeRemaining.minutes > 0) parts.push(`${timeRemaining.minutes}m`);
    if (timeRemaining.days === 0) parts.push(`${timeRemaining.seconds}s`);

    return parts.join(' ') || '0s';
  };

  const getProgressValue = () => {
    if (!timeRemaining) return 0;

    // Calculate progress based on original session duration
    const sessionStart = session.start_time ? new Date(session.start_time).getTime() : Date.now();
    const sessionEnd = new Date(session.expires_at).getTime();
    const totalDuration = sessionEnd - sessionStart;
    const elapsed = Date.now() - sessionStart;

    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  if (!timeRemaining) return null;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <CardTitle className="text-lg">Parking Session</CardTitle>
          </div>
          <Badge variant={getStatusColor()} className="font-mono">
            {session.status.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          Confirmation: {session.confirmation_code}
          {session.slot?.description && ` • ${session.slot.description}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Time Remaining Display */}
        <div className="text-center space-y-2">
          <div className={`text-3xl font-mono font-bold ${
            timeRemaining.isExpired ? 'text-red-600' :
            timeRemaining.totalSeconds <= 300 ? 'text-red-500' :
            timeRemaining.totalSeconds <= 900 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {getTimeDisplay()}
          </div>
          <div className="text-sm text-gray-500">
            {timeRemaining.isExpired ? 'Session has expired' : 'Time remaining'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress
            value={getProgressValue()}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Started</span>
            <span>Expires {new Date(session.expires_at).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Warning Alerts */}
        {timeRemaining.totalSeconds <= 900 && timeRemaining.totalSeconds > 300 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Your parking expires in {Math.ceil(timeRemaining.totalSeconds / 60)} minutes.
              Consider extending your session.
            </AlertDescription>
          </Alert>
        )}

        {timeRemaining.totalSeconds <= 300 && timeRemaining.totalSeconds > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ URGENT: Your parking expires in {timeRemaining.minutes}:{String(timeRemaining.seconds).padStart(2, '0')}!
            </AlertDescription>
          </Alert>
        )}

        {timeRemaining.isExpired && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Your parking session has expired. Please move your vehicle to avoid penalties.
            </AlertDescription>
          </Alert>
        )}

        {session.status === 'completed' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Parking session completed successfully.
            </AlertDescription>
          </Alert>
        )}

        {/* Session Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Amount Paid:</span>
            <div className="text-lg font-bold">${session.amount}</div>
          </div>
          <div>
            <span className="font-medium">Session ID:</span>
            <div className="font-mono text-xs">{session.id.slice(-8)}</div>
          </div>
        </div>

        {/* Location Info */}
        {session.slot && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>
              Lat: {session.slot.location.latitude.toFixed(6)},
              Lng: {session.slot.location.longitude.toFixed(6)}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {session.status === 'active' && !timeRemaining.isExpired && (
          <div className="space-y-2">
            {!showExtendOptions ? (
              <Button
                onClick={() => setShowExtendOptions(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Extend Session
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium">Extend by:</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExtendSession(0.5)}
                    disabled={isExtending}
                  >
                    +30min
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExtendSession(1)}
                    disabled={isExtending}
                  >
                    +1hr
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExtendSession(2)}
                    disabled={isExtending}
                  >
                    +2hr
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowExtendOptions(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for managing parking session countdowns
export function useParkingCountdown() {
  const store = useParkingStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === 'granted');
      });
    } else {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const extendSession = useCallback(async (sessionId: string, additionalHours: number) => {
    try {
      const response = await fetch(`/api/parking-sessions/${sessionId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          additional_hours: additionalHours
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extend session');
      }

      const data = await response.json();

      // Update store with extended session
      store.updateSession(sessionId, {
        expires_at: data.session.expires_at,
        amount: data.session.amount,
      });

      return data;
    } catch (error) {
      console.error('Error extending session:', error);
      throw error;
    }
  }, [store]);

  const endSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/parking-sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      const data = await response.json();

      // Update store with completed session
      store.updateSession(sessionId, {
        status: 'completed',
        end_time: data.session.end_time,
      });

      return data;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }, [store]);

  return {
    extendSession,
    endSession,
    notificationsEnabled,
    activeSessions: store.activeSessions,
    currentSession: store.currentSession,
  };
}