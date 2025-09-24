import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParkingStatusDemo } from '@/components/parking-status-demo';
import { ParkingCountdown, useParkingCountdown } from '@/components/parking-countdown';
import { QRCodeManagement } from '@/components/qr-code-management';
import { QRScanner, useQRScanner } from '@/components/qr-scanner';
import { useParkingStore, useUserLocation, useNearbySlots } from '@/providers/parking-provider';
import {
  Car,
  QrCode,
  MapPin,
  Clock,
  Settings,
  BarChart3,
  Scan,
  Navigation,
  Banknote
} from 'lucide-react';

interface ParkingDashboardProps {
  userRole: 'vehicle_owner' | 'slot_owner' | 'platform_owner' | 'enforcer';
}

export function ParkingDashboard({ userRole }: ParkingDashboardProps) {
  const store = useParkingStore();
  const { location, requestLocation } = useUserLocation();
  const { slots, refreshSlots } = useNearbySlots();
  const { extendSession, endSession, currentSession } = useParkingCountdown();
  const qrScanner = useQRScanner();

  const [activeTab, setActiveTab] = useState('overview');

  const handleQRScan = async (qrData: string) => {
    try {
      // Process QR scan
      const response = await fetch('/parking/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          qr_data: qrData,
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          } : null
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Handle successful scan - could navigate to booking page
        console.log('QR scan successful:', result.data);
        qrScanner.closeScanner();
      } else {
        console.error('QR scan failed:', result.message);
      }
    } catch (error) {
      console.error('Error processing QR scan:', error);
    }
  };

  const getTabsForRole = () => {
    const baseTabs = [
      { id: 'overview', label: 'Overview', icon: BarChart3 }
    ];

    switch (userRole) {
      case 'vehicle_owner':
        return [
          ...baseTabs,
          { id: 'scan', label: 'Scan QR', icon: QrCode },
          { id: 'sessions', label: 'My Sessions', icon: Clock },
          { id: 'nearby', label: 'Find Parking', icon: MapPin }
        ];

      case 'slot_owner':
        return [
          ...baseTabs,
          { id: 'my-slots', label: 'My Slots', icon: Car },
          { id: 'qr-management', label: 'QR Codes', icon: QrCode },
          { id: 'earnings', label: 'Earnings', icon: Banknote }
        ];

      case 'platform_owner':
      case 'enforcer':
        return [
          ...baseTabs,
          { id: 'all-slots', label: 'All Slots', icon: Car },
          { id: 'scanner', label: 'QR Scanner', icon: Scan },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 }
        ];

      default:
        return baseTabs;
    }
  };

  const tabs = getTabsForRole();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parking Dashboard</h1>
          <p className="text-gray-600">
            {userRole === 'vehicle_owner' && 'Find and book parking spaces'}
            {userRole === 'slot_owner' && 'Manage your parking slots'}
            {userRole === 'platform_owner' && 'Platform administration'}
            {userRole === 'enforcer' && 'Parking enforcement tools'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {location && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              Location enabled
            </Badge>
          )}
          {userRole === 'vehicle_owner' && (
            <Button onClick={qrScanner.openScanner}>
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
          )}
        </div>
      </div>

      {/* Active Session Alert */}
      {currentSession && userRole === 'vehicle_owner' && (
        <ParkingCountdown
          session={currentSession}
          onExtend={extendSession}
          onEnd={endSession}
        />
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            {userRole === 'vehicle_owner' && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{store.activeSessions.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Currently parking
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nearby Slots</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{slots.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Available spots
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {userRole === 'slot_owner' && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Slots</CardTitle>
                    <Car className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">4</div>
                    <p className="text-xs text-muted-foreground">
                      Total parking slots
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available</CardTitle>
                    <Car className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">
                      Ready for booking
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₱127.50</div>
                    <p className="text-xs text-muted-foreground">
                      +20.1% from yesterday
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* WebSocket Status Demo */}
          <div className="mt-6">
            <ParkingStatusDemo />
          </div>
        </TabsContent>

        {/* Vehicle Owner Tabs */}
        {userRole === 'vehicle_owner' && (
          <>
            <TabsContent value="scan">
              <Card>
                <CardHeader>
                  <CardTitle>QR Code Scanner</CardTitle>
                  <CardDescription>
                    Scan a parking slot QR code to view details and book the space
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={qrScanner.openScanner} size="lg" className="w-full">
                    <QrCode className="w-6 h-6 mr-2" />
                    Open QR Scanner
                  </Button>

                  {qrScanner.lastScan && (
                    <div className="mt-4 p-4 border rounded-lg">
                      <h4 className="font-medium">Last Scan:</h4>
                      <p className="text-sm text-gray-600 break-all">{qrScanner.lastScan}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions">
              <div className="space-y-4">
                {store.activeSessions.map((session) => (
                  <ParkingCountdown
                    key={session.id}
                    session={session}
                    onExtend={extendSession}
                    onEnd={endSession}
                  />
                ))}

                {store.activeSessions.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Sessions</h3>
                      <p className="text-gray-500">
                        Scan a QR code to start parking
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="nearby">
              <Card>
                <CardHeader>
                  <CardTitle>Nearby Parking Slots</CardTitle>
                  <CardDescription>
                    Find available parking spaces near your location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!location ? (
                    <div className="text-center py-8">
                      <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Location Required</h3>
                      <p className="text-gray-500 mb-4">
                        Enable location to find nearby parking slots
                      </p>
                      <Button onClick={requestLocation}>
                        <Navigation className="w-4 h-4 mr-2" />
                        Enable Location
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button onClick={refreshSlots} variant="outline">
                        <MapPin className="w-4 h-4 mr-2" />
                        Refresh Nearby Slots
                      </Button>

                      {slots.length > 0 ? (
                        <div className="grid gap-4">
                          {slots.map((slot) => (
                            <div key={slot.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">Slot {slot.id.slice(-8)}</h4>
                                  <p className="text-sm text-gray-500">
                                    ₱{slot.base_hourly_rate}/hour
                                  </p>
                                </div>
                                <Badge variant={slot.status === 'available' ? 'default' : 'secondary'}>
                                  {slot.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">
                          No parking slots found nearby
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        {/* Slot Owner Tabs */}
        {userRole === 'slot_owner' && (
          <>
            <TabsContent value="qr-management">
              <QRCodeManagement
                slots={[]} // This would be populated with the user's slots
                onRegenerateQR={async (slotId) => {
                  // Implement QR regeneration
                  console.log('Regenerating QR for slot:', slotId);
                }}
                onToggleQRStatus={async (slotId, status) => {
                  // Implement QR status toggle
                  console.log('Toggling QR status for slot:', slotId, status);
                }}
              />
            </TabsContent>

            <TabsContent value="my-slots">
              <Card>
                <CardHeader>
                  <CardTitle>My Parking Slots</CardTitle>
                  <CardDescription>
                    Manage your parking slot inventory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 py-8">
                    Slot management interface would go here
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="earnings">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Dashboard</CardTitle>
                  <CardDescription>
                    Track your parking slot revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 py-8">
                    Earnings analytics would go here
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* QR Scanner Modal */}
      <qrScanner.QRScannerComponent
        onScan={handleQRScan}
        onError={(error) => console.error('QR Scanner error:', error)}
      />
    </div>
  );
}