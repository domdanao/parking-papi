import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Car, Clock, Banknote } from 'lucide-react';
import { Head, Link } from '@inertiajs/react';

interface ScanResultProps {
  scanResult: {
    slot: {
      id: string;
      slot_number: string;
      status: string;
      base_hourly_rate: number;
      location: {
        latitude: number | string;
        longitude: number | string;
      };
      address?: string;
      landmark_references?: string;
      description?: string;
      amenities?: string[];
      vehicle_compatibility?: string[];
      surface_type?: string;
      dimensions?: {
        length_meters: number;
        width_meters: number;
        height_clearance_meters: number;
      };
      minimum_duration_minutes?: number;
      maximum_duration_minutes?: number;
      owner: {
        id: string;
        name: string;
        email: string;
      };
      area: {
        name: string;
      };
    };
    session_token: string;
    expires_at: string;
    pricing_info: {
      current_hourly_rate: number;
      base_hourly_rate: number;
      is_surge_pricing: boolean;
      rate_change_coming: boolean;
      next_hour_rate: number;
      examples: Record<string, number>;
      pricing_note: string;
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
  const slotId = slot.slot_number || slot.id.slice(-8).toUpperCase(); // Use real slot number or fallback

  const calculateAmount = (hours: string) => {
    const hourValue = parseFloat(hours);
    return (pricing_info.current_hourly_rate * hourValue).toFixed(2);
  };

  const handleBooking = async () => {
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
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to Magpie checkout
        window.location.href = result.data.checkout_url;
      } else {
        alert(result.message || 'Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  // Generate Google Maps URL
  const mapsUrl = `https://www.google.com/maps?q=${parseFloat(slot.location.latitude.toString())},${parseFloat(slot.location.longitude.toString())}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head title={`Parking Slot ${slotId}`} />

      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl shadow-md border border-blue-200 dark:border-blue-700 flex items-center justify-center">
              <img
                src="/images/parking-papi-thick-outline.png"
                alt="Parking Papi"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300 uppercase tracking-wide">PARKING SLOT #</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{slotId}</div>
            </div>
          </div>


          {/* Location Map */}
          <div className="relative h-48 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${Number(slot.location.latitude)},${Number(slot.location.longitude)}&zoom=17&maptype=roadmap`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs border dark:border-gray-600">
              <div className="font-medium text-gray-900 dark:text-white">{Number(slot.location.latitude).toFixed(6)}, {Number(slot.location.longitude).toFixed(6)}</div>
              <Link href={mapsUrl} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                View larger map
              </Link>
            </div>
          </div>

          {/* Pricing Info */}
          {pricing_info.is_surge_pricing && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></div>
                <div className="text-sm font-medium text-orange-700 dark:text-orange-300">Peak Hours Pricing</div>
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                Current rate: ₱{pricing_info.current_hourly_rate}/hour
                (Base: ₱{pricing_info.base_hourly_rate}/hour)
              </div>
              {pricing_info.rate_change_coming && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Next hour: ₱{pricing_info.next_hour_rate}/hour
                </div>
              )}
            </div>
          )}

        </div>

        {/* Booking Form */}
        <div className="px-6 space-y-4">
          {/* Plate Number */}
          <div>
            <label htmlFor="plate-number" className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5 uppercase tracking-wide">
              PLATE #
            </label>
            <input
              id="plate-number"
              type="text"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
              placeholder="ABC1234"
              maxLength={8}
              className="block w-full px-3 py-2.5 text-base text-center tracking-wider font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              No plate number? Use your conduction sticker number instead.
            </p>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-xs font-medium text-gray-900 dark:text-white mb-1.5 uppercase tracking-wide">
              DURATION
            </label>
            <div className="relative">
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="block w-full px-3 py-2.5 pr-10 text-base border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pay/Login Button */}
          <button
            type="button"
            onClick={handleBooking}
            disabled={isBooking || !plateNumber.trim()}
            className="w-full flex justify-center items-center px-4 py-3 text-lg font-semibold text-white bg-blue-600 dark:bg-blue-700 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBooking ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              `PAY ₱${calculateAmount(duration)}`
            )}
          </button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-300">
            Quick checkout - we'll collect your details during payment.
          </p>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            By clicking pay, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
              terms and conditions
            </Link>
          </p>
        </div>

        {/* Owner Info */}
        <div className="mx-6 my-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <p className="text-xs text-center text-gray-600 dark:text-gray-300">
            This parking slot is owned by <span className="font-medium">{slot.owner.name}</span>.
            Rates may be subject to change by the owner.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700 flex items-center justify-center">
                <img
                  src="/images/parking-papi-thick-outline.png"
                  alt="Parking Papi"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">POWERED BY Parking Papi</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
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