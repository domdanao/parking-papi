import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Car, Clock, DollarSign } from 'lucide-react';
import { Head, Link } from '@inertiajs/react';

interface ScanResultProps {
  scanResult: {
    slot: {
      id: string;
      status: string;
      base_hourly_rate: number;
      location: {
        latitude: number | string;
        longitude: number | string;
      };
      description?: string;
      owner: {
        name: string;
      };
      area: {
        name: string;
      };
    };
    session_token: string;
    expires_at: string;
    pricing_info: {
      hourly_rate: number;
      examples: Record<string, number>;
    };
  };
  encodedData: string;
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ScanResult({ scanResult, encodedData, isAuthenticated, user }: ScanResultProps) {
  const [plateNumber, setPlateNumber] = useState('');
  const [duration, setDuration] = useState('2');
  const [isBooking, setIsBooking] = useState(false);

  const { slot, pricing_info } = scanResult;
  const slotId = slot.id.slice(-8).toUpperCase(); // Get last 8 chars for display

  const calculateAmount = (hours: string) => {
    const hourValue = parseFloat(hours);
    return (slot.base_hourly_rate * hourValue).toFixed(2);
  };

  const handleBooking = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/login?redirect=${returnUrl}`;
      return;
    }

    if (!plateNumber.trim()) {
      alert('Please enter your plate number');
      return;
    }

    setIsBooking(true);
    try {
      const response = await fetch('/parking/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          session_token: scanResult.session_token,
          duration_hours: parseFloat(duration),
          plate_number: plateNumber,
          payment_method: 'digital_wallet', // Default payment method
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to success page or dashboard
        window.location.href = '/dashboard';
      } else {
        alert(result.message || 'Booking failed. Please try again.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  // Generate Google Maps URL
  const mapsUrl = `https://www.google.com/maps?q=${parseFloat(slot.location.latitude.toString())},${parseFloat(slot.location.longitude.toString())}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head title={`Parking Slot ${slotId}`} />

      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">PARKING SLOT #</div>
              <div className="text-2xl font-bold">{slotId}</div>
            </div>
          </div>

          {/* Location Map */}
          <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden mb-4">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(slot.location.longitude)-0.01},${Number(slot.location.latitude)-0.01},${Number(slot.location.longitude)+0.01},${Number(slot.location.latitude)+0.01}&layer=mapnik&marker=${Number(slot.location.latitude)},${Number(slot.location.longitude)}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            />
            <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded text-xs">
              <div className="font-medium">{Number(slot.location.latitude).toFixed(6)}, {Number(slot.location.longitude).toFixed(6)}</div>
              <Link href={mapsUrl} target="_blank" className="text-blue-600 hover:underline">
                View larger map
              </Link>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <div className="px-6 space-y-6">
          {/* Plate Number */}
          <div>
            <label htmlFor="plate-number" className="block text-sm font-medium text-gray-900 mb-2">
              PLATE #
            </label>
            <input
              id="plate-number"
              type="text"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              placeholder="ABC1234"
              maxLength={8}
              className="block w-full px-3 py-3 text-lg text-center tracking-wider font-mono border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              No plate number? Use your conduction sticker number instead.
            </p>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-900 mb-2">
              DURATION
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="block w-full px-3 py-3 text-lg border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
            >
              <option value="0.5">30 Minutes</option>
              <option value="1">1 Hour</option>
              <option value="1.5">1.5 Hours</option>
              <option value="2">2 Hours</option>
              <option value="3">3 Hours</option>
              <option value="4">4 Hours</option>
              <option value="6">6 Hours</option>
              <option value="8">8 Hours</option>
              <option value="12">12 Hours</option>
              <option value="24">24 Hours</option>
            </select>
          </div>

          {/* Pay/Login Button */}
          <button
            type="button"
            onClick={handleBooking}
            disabled={isBooking || (!isAuthenticated && false) || (isAuthenticated && !plateNumber.trim())}
            className="w-full flex justify-center items-center px-4 py-4 text-xl font-bold text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBooking ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : !isAuthenticated ? (
              `LOGIN TO PAY ₱${calculateAmount(duration)}`
            ) : (
              `PAY ₱${calculateAmount(duration)}`
            )}
          </button>

          {!isAuthenticated && (
            <p className="text-sm text-center text-gray-600">
              You'll be redirected to login, then brought back here to complete your booking.
            </p>
          )}

          {isAuthenticated && user && (
            <p className="text-sm text-center text-gray-600">
              Booking as <span className="font-medium">{user.name}</span>
            </p>
          )}

          <p className="text-xs text-center text-gray-500">
            By clicking pay, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              terms and conditions
            </Link>
          </p>
        </div>

        {/* Owner Info */}
        <div className="mx-6 my-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-xs text-center text-gray-600">
            This parking slot is owned by <span className="font-medium">{slot.owner.name}</span>.
            Rates may be subject to change by the owner.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
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

      {/* Pricing Info Modal - Hidden but available for expansion */}
      <div className="hidden">
        <Card className="m-4">
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Pricing Information</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Hourly Rate:</span>
                <span>₱{slot.base_hourly_rate}</span>
              </div>
              {Object.entries(pricing_info.examples).map(([duration, price]) => (
                <div key={duration} className="flex justify-between text-gray-600">
                  <span>{duration}:</span>
                  <span>₱{price}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}