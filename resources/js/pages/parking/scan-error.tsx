import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, QrCode, RefreshCw } from 'lucide-react';
import { Head, Link } from '@inertiajs/react';

interface ScanErrorProps {
  error: string;
  encodedData: string;
  isAuthenticated: boolean;
}

export default function ScanError({ error, encodedData, isAuthenticated }: ScanErrorProps) {
  const handleRetry = () => {
    // Retry the same QR scan
    window.location.href = `/parking/scan/${encodedData}`;
  };

  const getErrorDetails = (errorMessage: string) => {
    if (errorMessage.includes('not found')) {
      return {
        title: 'Parking Slot Not Found',
        description: 'This QR code does not correspond to a valid parking slot.',
        suggestion: 'Please check if you scanned the correct QR code or contact the parking operator.',
        icon: QrCode,
        showRetry: false
      };
    }

    if (errorMessage.includes('not available')) {
      return {
        title: 'Parking Slot Unavailable',
        description: 'This parking slot is currently occupied or reserved.',
        suggestion: 'Please try scanning a different parking slot QR code.',
        icon: AlertCircle,
        showRetry: true
      };
    }

    if (errorMessage.includes('too far') || errorMessage.includes('location')) {
      return {
        title: 'Location Verification Failed',
        description: 'You must be near the parking slot to scan this QR code.',
        suggestion: 'Please move closer to the parking slot and try again.',
        icon: AlertCircle,
        showRetry: true
      };
    }

    if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
      return {
        title: 'Invalid QR Code',
        description: 'This QR code appears to be invalid or expired.',
        suggestion: 'Please contact the parking operator for assistance.',
        icon: AlertCircle,
        showRetry: false
      };
    }

    return {
      title: 'Scan Failed',
      description: errorMessage || 'An unexpected error occurred while processing the QR code.',
      suggestion: 'Please try again or contact support if the problem persists.',
      icon: AlertCircle,
      showRetry: true
    };
  };

  const errorDetails = getErrorDetails(error);
  const ErrorIcon = errorDetails.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head title="Scan Error" />

      {/* Decorative Border */}
      <div
        className="w-full h-4 bg-repeat-x"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvv width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l10 10L0 20L10 10 20 0v20L10 10 0 0z' fill='%23000'/%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px'
        }}
      />

      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="p-6">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          )}

          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ErrorIcon className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {errorDetails.title}
            </h1>

            <p className="text-gray-600 mb-6">
              {errorDetails.description}
            </p>
          </div>
        </div>

        {/* Error Details */}
        <div className="px-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">What happened?</h3>
                  <p className="text-sm text-gray-600">
                    {errorDetails.suggestion}
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-xs text-red-800 font-medium mb-1">Error Details:</div>
                  <div className="text-xs text-red-700 font-mono break-all">
                    {error}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="px-6 space-y-3">
          {errorDetails.showRetry && (
            <Button
              onClick={handleRetry}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}

          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="w-full h-12"
              >
                Back to Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button
                variant="outline"
                className="w-full h-12"
              >
                Back to Home
              </Button>
            </Link>
          )}

          <Link href="/parking/search">
            <Button
              variant="ghost"
              className="w-full h-12"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Different QR Code
            </Button>
          </Link>
        </div>

        {/* Help Section */}
        <div className="px-6 py-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Need Help?</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Make sure you're scanning a Parking Papi QR code</p>
              <p>• Ensure you're physically near the parking slot</p>
              <p>• Check that your location services are enabled</p>
              <p>• Contact the parking operator if the issue persists</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium">POWERED BY Parking Papi</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Copyright © 2025
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Decorative Border */}
      <div
        className="w-full h-4 bg-repeat-x"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l10 10L0 20L10 10 20 0v20L10 10 0 0z' fill='%23000'/%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px'
        }}
      />
    </div>
  );
}