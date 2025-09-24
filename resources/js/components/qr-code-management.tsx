import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  QrCode,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Printer,
  BarChart3,
  MapPin,
  DollarSign,
  Calendar
} from 'lucide-react';

interface ParkingSlot {
  id: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  base_hourly_rate: number;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  qr_code?: {
    id: string;
    qr_image_path: string;
    qr_data: string;
    scan_count: number;
    last_scanned_at?: string;
    status: 'active' | 'inactive' | 'expired';
  };
}

interface QRCodeManagementProps {
  slots: ParkingSlot[];
  onRegenerateQR?: (slotId: string) => Promise<void>;
  onToggleQRStatus?: (slotId: string, status: 'active' | 'inactive') => Promise<void>;
  className?: string;
}

export function QRCodeManagement({
  slots,
  onRegenerateQR,
  onToggleQRStatus,
  className
}: QRCodeManagementProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [previewQR, setPreviewQR] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const selectedSlotData = slots.find(slot => slot.id === selectedSlot);

  // Auto-select first slot if none selected
  useEffect(() => {
    if (!selectedSlot && slots.length > 0) {
      setSelectedSlot(slots[0].id);
    }
  }, [slots, selectedSlot]);

  const handleCopyQRData = async (qrData: string, slotId: string) => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopiedText(slotId);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy QR data:', error);
    }
  };

  const handleDownloadQR = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot?.qr_code?.qr_image_path) return;

    try {
      const response = await fetch(`/storage/${slot.qr_code.qr_image_path}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `parking-slot-${slotId.slice(-8)}-qr.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  const handlePrintQR = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot?.qr_code?.qr_image_path) return;

    try {
      const qrUrl = `/storage/${slot.qr_code.qr_image_path}`;

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Parking Slot QR Code - ${slot.description || `Slot ${slotId.slice(-8)}`}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .qr-container {
              page-break-inside: avoid;
              margin-bottom: 30px;
            }
            .qr-image {
              width: 300px;
              height: 300px;
              margin: 20px auto;
            }
            .slot-info {
              margin: 20px 0;
            }
            .rate {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .instructions {
              font-size: 14px;
              color: #666;
              margin-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>Parking Slot</h1>
            <div class="slot-info">
              <div>${slot.description || `Slot ${slotId.slice(-8)}`}</div>
              <div class="rate">₱${slot.base_hourly_rate}/hour</div>
            </div>
            <img src="${qrUrl}" alt="QR Code" class="qr-image" />
            <div class="instructions">
              <p><strong>How to Park:</strong></p>
              <p>1. Scan this QR code with your phone</p>
              <p>2. Follow the payment instructions</p>
              <p>3. Display confirmation on dashboard</p>
            </div>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error('Failed to print QR code:', error);
    }
  };

  const handleRegenerateQR = async (slotId: string) => {
    if (!onRegenerateQR) return;

    setIsLoading(prev => ({ ...prev, [slotId]: true }));
    try {
      await onRegenerateQR(slotId);
    } finally {
      setIsLoading(prev => ({ ...prev, [slotId]: false }));
    }
  };

  const handleToggleStatus = async (slotId: string, currentStatus: string) => {
    if (!onToggleQRStatus) return;

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setIsLoading(prev => ({ ...prev, [slotId]: true }));
    try {
      await onToggleQRStatus(slotId, newStatus as 'active' | 'inactive');
    } finally {
      setIsLoading(prev => ({ ...prev, [slotId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            QR Code Management
          </CardTitle>
          <CardDescription>
            Manage QR codes for your parking slots. Generate, download, and track usage.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Slot List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Your Parking Slots</CardTitle>
            <CardDescription>
              {slots.length} slot{slots.length !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedSlot === slot.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedSlot(slot.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {slot.description || `Slot ${slot.id.slice(-8)}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      ₱{slot.base_hourly_rate}/hour
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={slot.status === 'available' ? 'default' : 'secondary'}>
                      {slot.status}
                    </Badge>
                    {slot.qr_code && (
                      <Badge variant={getStatusColor(slot.qr_code.status)} className="text-xs">
                        QR: {slot.qr_code.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* QR Code Details */}
        <Card className="lg:col-span-2">
          {selectedSlotData ? (
            <Tabs defaultValue="qr-code">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedSlotData.description || `Slot ${selectedSlotData.id.slice(-8)}`}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span>₱{selectedSlotData.base_hourly_rate}/hour</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {Number(selectedSlotData.location.latitude).toFixed(6)}, {Number(selectedSlotData.location.longitude).toFixed(6)}
                      </span>
                    </CardDescription>
                  </div>
                  <TabsList>
                    <TabsTrigger value="qr-code">QR Code</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>

              <CardContent>
                <TabsContent value="qr-code" className="space-y-4">
                  {selectedSlotData.qr_code ? (
                    <div className="space-y-4">
                      {/* QR Code Preview */}
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                          <img
                            src={`/storage/${selectedSlotData.qr_code.qr_image_path}`}
                            alt="QR Code"
                            className="w-48 h-48 border rounded-lg"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge variant={getStatusColor(selectedSlotData.qr_code.status)}>
                              {selectedSlotData.qr_code.status}
                            </Badge>
                          </div>
                        </div>

                        {/* QR Code Actions */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadQR(selectedSlotData.id)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintQR(selectedSlotData.id)}
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyQRData(selectedSlotData.qr_code!.qr_data, selectedSlotData.id)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {copiedText === selectedSlotData.id ? 'Copied!' : 'Copy URL'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(selectedSlotData.id, selectedSlotData.qr_code!.status)}
                            disabled={isLoading[selectedSlotData.id]}
                          >
                            {selectedSlotData.qr_code.status === 'active' ? (
                              <><EyeOff className="w-4 h-4 mr-2" />Disable</>
                            ) : (
                              <><Eye className="w-4 h-4 mr-2" />Enable</>
                            )}
                          </Button>
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => handleRegenerateQR(selectedSlotData.id)}
                          disabled={isLoading[selectedSlotData.id]}
                          className="w-full"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading[selectedSlotData.id] ? 'animate-spin' : ''}`} />
                          Regenerate QR Code
                        </Button>
                      </div>

                      {/* QR Code Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Scan Count:</span>
                          <div className="text-lg font-bold">{selectedSlotData.qr_code.scan_count}</div>
                        </div>
                        <div>
                          <span className="font-medium">Last Scanned:</span>
                          <div>
                            {selectedSlotData.qr_code.last_scanned_at
                              ? new Date(selectedSlotData.qr_code.last_scanned_at).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </div>
                      </div>

                      {selectedSlotData.qr_code.status === 'inactive' && (
                        <Alert>
                          <EyeOff className="h-4 w-4" />
                          <AlertDescription>
                            This QR code is currently disabled. Customers cannot scan it to book this slot.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No QR Code Generated</h3>
                      <p className="text-gray-500 mb-4">
                        Generate a QR code for this parking slot to allow customers to book it.
                      </p>
                      <Button
                        onClick={() => handleRegenerateQR(selectedSlotData.id)}
                        disabled={isLoading[selectedSlotData.id]}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Generate QR Code
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                  {selectedSlotData.qr_code ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-medium">Total Scans</span>
                          </div>
                          <div className="text-2xl font-bold">{selectedSlotData.qr_code.scan_count}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-medium">Rate</span>
                          </div>
                          <div className="text-2xl font-bold">${selectedSlotData.base_hourly_rate}</div>
                          <div className="text-xs text-gray-500">per hour</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-500" />
                            <span className="text-sm font-medium">Last Activity</span>
                          </div>
                          <div className="text-sm font-medium">
                            {selectedSlotData.qr_code.last_scanned_at
                              ? new Date(selectedSlotData.qr_code.last_scanned_at).toLocaleDateString()
                              : 'No activity'
                            }
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4" />
                      <p>Generate a QR code to see analytics</p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          ) : (
            <CardContent className="py-8 text-center text-gray-500">
              <QrCode className="w-16 h-16 mx-auto mb-4" />
              <p>Select a parking slot to manage its QR code</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}