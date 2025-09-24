import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    slotId: string;
    slotNumber: string;
}

export default function QRCodeModal({ isOpen, onClose, slotId, slotNumber }: QRCodeModalProps) {
    const [qrCodeSvg, setQrCodeSvg] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (isOpen && slotId) {
            fetchQRCode();
        }
    }, [isOpen, slotId]);

    const fetchQRCode = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/slots/${slotId}/qr-code`);
            if (!response.ok) {
                throw new Error('Failed to fetch QR code');
            }

            const svgText = await response.text();
            setQrCodeSvg(svgText);
        } catch (err) {
            setError('Failed to load QR code. Please try again.');
            console.error('QR Code fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const downloadQRCode = async () => {
        if (!qrCodeSvg || !canvasRef.current) return;

        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set canvas size for high quality (300 DPI equivalent)
            const size = 800;
            canvas.width = size;
            canvas.height = size;

            // Create white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            // Create QR code image
            const qrImage = new Image();
            const qrSvgBlob = new Blob([qrCodeSvg], { type: 'image/svg+xml' });
            const qrUrl = URL.createObjectURL(qrSvgBlob);

            qrImage.onload = async () => {
                // Draw QR code
                ctx.drawImage(qrImage, 0, 0, size, size);

                // Load and draw logo in center
                const logoResponse = await fetch('/images/favicon-thick-outline.svg');
                const logoSvg = await logoResponse.text();
                const logoImage = new Image();
                const logoBlob = new Blob([logoSvg], { type: 'image/svg+xml' });
                const logoUrl = URL.createObjectURL(logoBlob);

                logoImage.onload = () => {
                    // Calculate logo size (about 25% of QR code - larger but still readable)
                    const logoSize = size * 0.25;
                    const logoX = (size - logoSize) / 2;
                    const logoY = (size - logoSize) / 2;

                    // Draw logo directly without white circle
                    ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

                    // Create download
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `parking-slot-${slotNumber}-qr-code.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }
                    }, 'image/png', 1.0);

                    // Clean up
                    URL.revokeObjectURL(logoUrl);
                };
                logoImage.src = logoUrl;
                URL.revokeObjectURL(qrUrl);
            };
            qrImage.src = qrUrl;
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    const shareQRCode = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Parking Slot ${slotNumber} QR Code`,
                    text: `Scan this QR code to park at Slot ${slotNumber}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share cancelled or failed');
            }
        } else {
            // Fallback: copy URL to clipboard
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-lg mx-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">
                            Slot {slotNumber} QR Code
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* QR Code Display */}
                        <div className="flex flex-col items-center">
                            {loading ? (
                                <div className="w-80 h-80 bg-muted rounded-lg flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : error ? (
                                <div className="w-80 h-80 bg-muted rounded-lg flex items-center justify-center text-center p-4">
                                    <div>
                                        <p className="text-sm text-destructive mb-2">{error}</p>
                                        <Button size="sm" onClick={fetchQRCode}>
                                            Try Again
                                        </Button>
                                    </div>
                                </div>
                            ) : qrCodeSvg ? (
                                <div className="relative">
                                    {/* QR Code with Logo Overlay - Larger container */}
                                    <div className="w-80 h-80 border-2 border-muted rounded-lg overflow-hidden bg-white flex items-center justify-center">
                                        <div
                                            className="w-full h-full flex items-center justify-center"
                                            dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                                        />
                                    </div>
                                    {/* Logo Overlay - positioned to not hide QR data */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <img
                                            src="/images/favicon-thick-outline.svg"
                                            alt="Parking Papi Logo"
                                            className="w-16 h-16"
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Instructions */}
                        <div className="text-center space-y-2">
                            <h3 className="font-medium">Vehicle owners can scan this code to:</h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• View slot information and pricing</li>
                                <li>• Start a parking session</li>
                                <li>• Make secure payments</li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                onClick={downloadQRCode}
                                className="flex-1"
                                disabled={!qrCodeSvg}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                            <Button
                                onClick={shareQRCode}
                                variant="outline"
                                className="flex-1"
                            >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground text-center">
                            💡 Print this QR code and display it at your parking slot for easy access
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hidden canvas for download generation */}
            <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
                width={800}
                height={800}
            />
        </>
    );
}