import { useCallback, useEffect, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Search, Navigation } from 'lucide-react';

interface Location {
    lat: number;
    lng: number;
    address?: string;
}

interface MapLocationPickerProps {
    initialLocation?: Location;
    onLocationChange: (location: Location) => void;
    height?: string;
    className?: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Map component that uses the Google Maps API
function Map({
    center,
    zoom,
    onLocationSelect
}: {
    center: google.maps.LatLngLiteral;
    zoom: number;
    onLocationSelect: (location: Location) => void;
}) {
    const [map, setMap] = useState<google.maps.Map>();
    const [marker, setMarker] = useState<google.maps.Marker>();

    const ref = useCallback((node: HTMLDivElement) => {
        if (node !== null && !map) {
            // Detect dark mode
            const isDarkMode = document.documentElement.classList.contains('dark') ||
                             window.matchMedia('(prefers-color-scheme: dark)').matches;

            const newMap = new window.google.maps.Map(node, {
                center,
                zoom,
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: true,
                zoomControl: true,
                styles: [
                    // Keep light map appearance, just hide POI labels
                    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
                ]
            });

            setMap(newMap);

            // Add click listener to map
            newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
                const lat = event.latLng?.lat();
                const lng = event.latLng?.lng();

                if (lat && lng) {
                    // Reverse geocode to get address
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode(
                        { location: { lat, lng } },
                        (results, status) => {
                            let address = '';
                            if (status === 'OK' && results?.[0]) {
                                address = results[0].formatted_address;
                            }

                            onLocationSelect({ lat, lng, address });
                        }
                    );
                }
            });
        }
    }, [center, zoom, onLocationSelect, map]);

    useEffect(() => {
        if (map && marker) {
            marker.setMap(null);
        }

        if (map) {
            const newMarker = new google.maps.Marker({
                position: center,
                map,
                draggable: true,
                title: 'Parking Slot Location'
            });

            // Add drag listener
            newMarker.addListener('dragend', () => {
                const position = newMarker.getPosition();
                const lat = position?.lat();
                const lng = position?.lng();

                if (lat && lng) {
                    // Reverse geocode to get address
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode(
                        { location: { lat, lng } },
                        (results, status) => {
                            let address = '';
                            if (status === 'OK' && results?.[0]) {
                                address = results[0].formatted_address;
                            }

                            onLocationSelect({ lat, lng, address });
                        }
                    );
                }
            });

            setMarker(newMarker);
            map.setCenter(center);
        }
    }, [map, center, onLocationSelect]);

    return <div ref={ref} className="w-full h-full" />;
}

// Render function for different loading states
const render = (status: Status) => {
    switch (status) {
        case Status.LOADING:
            return (
                <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-slate-800 rounded-lg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">Loading Google Maps...</p>
                    </div>
                </div>
            );
        case Status.FAILURE:
            return (
                <Alert variant="destructive">
                    <AlertDescription>
                        Failed to load Google Maps. Please check your API key and internet connection.
                    </AlertDescription>
                </Alert>
            );
        default:
            return null;
    }
};

export default function MapLocationPicker({
    initialLocation,
    onLocationChange,
    height = "400px",
    className = ""
}: MapLocationPickerProps) {
    const [location, setLocation] = useState<Location>(
        initialLocation || { lat: 37.7749, lng: -122.4194 } // Default to San Francisco
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Get user's current location
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setLocation(newLocation);
                    onLocationChange(newLocation);
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        }
    };

    // Search for a location using Geocoding API
    const searchLocation = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode(
                { address: searchQuery },
                (results, status) => {
                    setIsSearching(false);
                    if (status === 'OK' && results?.[0]) {
                        const result = results[0];
                        const lat = result.geometry.location.lat();
                        const lng = result.geometry.location.lng();
                        const address = result.formatted_address;

                        const newLocation = { lat, lng, address };
                        setLocation(newLocation);
                        onLocationChange(newLocation);
                    }
                }
            );
        } catch (error) {
            setIsSearching(false);
            console.error('Geocoding error:', error);
        }
    };

    const handleLocationSelect = (newLocation: Location) => {
        setLocation(newLocation);
        onLocationChange(newLocation);
    };

    // Handle Enter key in search input
    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchLocation();
        }
    };

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <Alert variant="destructive">
                <AlertDescription>
                    Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Search and Location Controls */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Label htmlFor="location-search">Search for a location</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                id="location-search"
                                placeholder="Enter address, landmark, or coordinates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleSearchKeyPress}
                            />
                            <Button
                                onClick={searchLocation}
                                disabled={isSearching || !searchQuery.trim()}
                                variant="outline"
                                size="icon"
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col justify-end">
                        <Button
                            onClick={getCurrentLocation}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Navigation className="h-4 w-4" />
                            My Location
                        </Button>
                    </div>
                </div>

                {/* Current Location Display */}
                {location.address && (
                    <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-gray-900 dark:text-slate-100">Selected Location:</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{location.address}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </p>
                    </div>
                )}
            </div>

            {/* Google Map */}
            <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden" style={{ height }}>
                <Wrapper
                    apiKey={GOOGLE_MAPS_API_KEY}
                    render={render}
                    libraries={['places', 'geometry']}
                >
                    <Map
                        center={location}
                        zoom={15}
                        onLocationSelect={handleLocationSelect}
                    />
                </Wrapper>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400">
                💡 Click on the map or drag the marker to select the exact parking slot location
            </p>
        </div>
    );
}