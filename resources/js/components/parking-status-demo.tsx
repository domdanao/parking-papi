import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useParkingStore, useParkingWebSocketConnection, useUserLocation, useNearbySlots } from '@/providers/parking-provider';
import { ConnectionStatus } from '@/components/connection-status';
import { MapPin, Wifi, WifiOff, RefreshCw, Car, Clock } from 'lucide-react';

export function ParkingStatusDemo() {
  const store = useParkingStore();
  const ws = useParkingWebSocketConnection();
  const { location, isLoading: locationLoading, requestLocation } = useUserLocation();
  const { slots, visibleSlots, isLoading: slotsLoading, refreshSlots } = useNearbySlots();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'reserved': return 'bg-yellow-500';
      case 'maintenance': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getConnectionStatusColor = () => {
    switch (ws.connectionState) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-blue-600';
      case 'reconnecting': return 'text-yellow-600';
      case 'disconnected': return 'text-orange-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {ws.isConnected ? (
              <Wifi className={`w-5 h-5 ${getConnectionStatusColor()}`} />
            ) : (
              <WifiOff className={`w-5 h-5 ${getConnectionStatusColor()}`} />
            )}
            WebSocket Connection Status
          </CardTitle>
          <CardDescription>
            Real-time connection to parking platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant="outline" className={getConnectionStatusColor()}>
                  {ws.connectionState}
                </Badge>
              </div>
              {ws.queueSize > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Queued messages:</span>
                  <Badge variant="secondary">{ws.queueSize}</Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Subscribed areas:</span>
                <Badge variant="secondary">{ws.subscribedAreas.length}</Badge>
              </div>
            </div>
            <Button
              onClick={ws.connect}
              disabled={ws.connectionState === 'connecting'}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location & Nearby Slots
          </CardTitle>
          <CardDescription>
            Your location and available parking slots
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Location */}
            <div className="flex items-center justify-between">
              <div>
                {location ? (
                  <div className="text-sm">
                    <div>Lat: {location.latitude.toFixed(6)}</div>
                    <div>Lng: {location.longitude.toFixed(6)}</div>
                    <div className="text-gray-500">
                      Accuracy: {location.accuracy?.toFixed(0)}m
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Location not available
                  </div>
                )}
              </div>
              <Button
                onClick={requestLocation}
                disabled={locationLoading}
                size="sm"
              >
                {locationLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                Get Location
              </Button>
            </div>

            {/* Nearby Slots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Nearby Parking Slots</h4>
                <Button
                  onClick={refreshSlots}
                  disabled={slotsLoading}
                  size="sm"
                  variant="outline"
                >
                  {slotsLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>

              {visibleSlots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleSlots.slice(0, 6).map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(slot.status)}`} />
                          <span className="text-sm font-medium">
                            Slot {slot.id.slice(-8)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {slot.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>${slot.base_hourly_rate}/hour</div>
                        <div>Updated: {new Date(slot.updated_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div>No nearby parking slots found</div>
                  <div className="text-xs">Try refreshing or enabling location</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Status */}
      {store.currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Current Parking Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confirmation Code:</span>
                <Badge variant="outline">{store.currentSession.confirmation_code}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant="outline">{store.currentSession.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Amount:</span>
                <span className="text-sm">${store.currentSession.amount}</span>
              </div>
              {store.currentSession.expires_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Expires:</span>
                  <span className="text-sm">
                    {new Date(store.currentSession.expires_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      {store.notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              {store.unreadNotificationCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {store.unreadNotificationCount} unread
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {store.notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border rounded-lg ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-sm text-gray-600">{notification.message}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {notification.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Development Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Development Tools</CardTitle>
          <CardDescription>
            Tools for testing WebSocket functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={() => ws.requestSync()}
              size="sm"
              variant="outline"
            >
              Request Sync
            </Button>
            <Button
              onClick={() => store.addNotification({
                id: `test-${Date.now()}`,
                type: 'expiry_warning',
                title: 'Test Notification',
                message: 'This is a test notification',
              })}
              size="sm"
              variant="outline"
            >
              Test Notification
            </Button>
            <Button
              onClick={() => store.clearNotifications()}
              size="sm"
              variant="outline"
            >
              Clear Notifications
            </Button>
            <Button
              onClick={() => store.syncWithServer()}
              size="sm"
              variant="outline"
            >
              Force Sync
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}