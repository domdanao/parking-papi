import { useCallback, useEffect, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin } from 'lucide-react';

interface Location {
    lat: number;
    lng: number;
    title?: string;
    address?: string;
}

interface MapDisplayProps {
    location: Location;
    height?: string;
    zoom?: number;
    className?: string;
    showMarker?: boolean;
    showInfoWindow?: boolean;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Map component that displays a location
function Map({
    center,
    zoom,
    title,
    address,
    showInfoWindow = false
}: {
    center: google.maps.LatLngLiteral;
    zoom: number;
    title?: string;
    address?: string;
    showInfoWindow?: boolean;
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
                gestureHandling: 'cooperative',
                styles: [
                    // Keep light map appearance, just hide POI labels
                    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
                ]
            });

            setMap(newMap);
        }
    }, [center, zoom, map]);

    useEffect(() => {
        if (map && marker) {
            marker.setMap(null);
        }

        if (map) {
            const newMarker = new google.maps.Marker({
                position: center,
                map,
                title: title || 'Parking Slot Location',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 8
                }
            });

            setMarker(newMarker);
            map.setCenter(center);

            // Add info window if requested
            if (showInfoWindow && (title || address)) {
                // Detect dark mode for InfoWindow styling
                const isDarkMode = document.documentElement.classList.contains('dark') ||
                                 window.matchMedia('(prefers-color-scheme: dark)').matches;

                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px; min-width: 200px; ${isDarkMode ?
                            'background-color: #334155; color: #f1f5f9; border-radius: 8px;' :
                            'background-color: white; color: #1e293b;'
                        }">
                            ${title ? `<h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; ${isDarkMode ? 'color: #f1f5f9;' : 'color: #1e293b;'}">${title}</h3>` : ''}
                            ${address ? `<p style="margin: 0; font-size: 14px; ${isDarkMode ? 'color: #cbd5e1;' : 'color: #666;'}">${address}</p>` : ''}
                            <p style="margin: 4px 0 0 0; font-size: 12px; ${isDarkMode ? 'color: #94a3b8;' : 'color: #888;'}">
                                ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}
                            </p>
                        </div>
                    `
                });

                newMarker.addListener('click', () => {
                    infoWindow.open(map, newMarker);
                });

                // Auto-open info window
                infoWindow.open(map, newMarker);
            }
        }
    }, [map, center, title, address, showInfoWindow]);

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
                        <p className="text-sm text-gray-600 dark:text-slate-300">Loading map...</p>
                    </div>
                </div>
            );
        case Status.FAILURE:
            return (
                <Alert variant="destructive">
                    <AlertDescription>
                        Failed to load map. Please check your internet connection.
                    </AlertDescription>
                </Alert>
            );
        default:
            return null;
    }
};

export default function MapDisplay({
    location,
    height = "300px",
    zoom = 15,
    className = "",
    showMarker = true,
    showInfoWindow = false
}: MapDisplayProps) {
    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <Alert variant="destructive">
                <AlertDescription>
                    Google Maps API key is not configured.
                </AlertDescription>
            </Alert>
        );
    }


    return (
        <div className={`border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden ${className}`} style={{ height }}>
            <Wrapper
                apiKey={GOOGLE_MAPS_API_KEY}
                render={render}
                libraries={['places', 'geometry']}
            >
                <Map
                    center={location}
                    zoom={zoom}
                    title={location.title}
                    address={location.address}
                    showInfoWindow={showInfoWindow}
                />
            </Wrapper>
        </div>
    );
}