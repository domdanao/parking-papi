import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, Scan } from 'lucide-react';
import { useParkingApi } from '@/hooks/use-api';

interface QRScannerProps {
    onScanComplete?: (result: any) => void;
    onClose?: () => void;
}

export function QRScanner({ onScanComplete, onClose }: QRScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { scanQR, loading, error } = useParkingApi();

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            setIsScanning(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera on mobile
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setIsScanning(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    };

    const simulateQRScan = () => {
        // For demo purposes, simulate a QR code scan
        const mockQRData = btoa(JSON.stringify({
            slot_id: '550e8400-e29b-41d4-a716-446655440000'
        }));
        setScanResult(mockQRData);
    };

    const handleScanSubmit = async () => {
        if (!scanResult) return;

        // Get current location (in a real app, this would use the actual geolocation API)
        const mockLocation = {
            latitude: 40.7128,
            longitude: -74.0060
        };

        const result = await scanQR(scanResult, mockLocation);

        if (result && result.success) {
            onScanComplete?.(result.data);
            stopCamera();
        }
    };

    if (!isScanning && !scanResult) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Scan className="h-5 w-5" />
                        QR Code Scanner
                    </CardTitle>
                    <CardDescription>
                        Scan the QR code on the parking slot to begin your session
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="h-16 w-16 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                        <Button onClick={startCamera} className="w-full">
                            <Camera className="mr-2 h-4 w-4" />
                            Start Camera
                        </Button>
                        <Button
                            variant="outline"
                            onClick={simulateQRScan}
                            className="w-full"
                        >
                            Simulate QR Scan (Demo)
                        </Button>
                        {onClose && (
                            <Button variant="ghost" onClick={onClose} className="w-full">
                                Cancel
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (scanResult) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="text-green-600">QR Code Detected!</CardTitle>
                    <CardDescription>
                        Ready to process your parking session
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                        <div className="text-green-600 font-mono text-sm break-all">
                            {scanResult.substring(0, 50)}...
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Button
                            onClick={handleScanSubmit}
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Confirm Scan'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setScanResult(null)}
                            className="w-full"
                            disabled={loading}
                        >
                            Scan Again
                        </Button>
                        {onClose && (
                            <Button variant="ghost" onClick={onClose} className="w-full">
                                Cancel
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Scanning QR Code</CardTitle>
                <Button variant="ghost" size="sm" onClick={stopCamera}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white"></div>
                        </div>
                    </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                    Point your camera at the QR code on the parking slot
                </p>
                <Button
                    variant="outline"
                    onClick={simulateQRScan}
                    className="w-full mt-4"
                >
                    Simulate Detection (Demo)
                </Button>
            </CardContent>
        </Card>
    );
}