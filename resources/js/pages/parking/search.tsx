import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ParkingSlot } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { MapPin, Clock, DollarSign, Star, Filter, Search } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Find Parking',
        href: '/parking/search',
    },
];

interface ParkingSearchProps {
    slots: ParkingSlot[];
    filters: {
        vehicle_types: string[];
        amenities: string[];
        price_ranges: Array<{ label: string; min: number; max: number }>;
    };
}

export default function ParkingSearch({ slots, filters }: ParkingSearchProps) {
    const [searchLocation, setSearchLocation] = useState('');
    const [selectedFilters, setSelectedFilters] = useState({
        vehicle_type: '',
        amenities: [] as string[],
        price_range: '',
    });

    const handleSearch = () => {
        // In a real implementation, this would trigger a new search with filters
        console.log('Searching with:', { searchLocation, selectedFilters });
    };

    const toggleAmenity = (amenity: string) => {
        setSelectedFilters(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Find Parking" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Find Parking</h1>
                        <p className="text-muted-foreground">Search for available parking spots near you</p>
                    </div>
                </div>

                {/* Search Bar */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Enter location (e.g., 123 Main St, Downtown)"
                                    value={searchLocation}
                                    onChange={(e) => setSearchLocation(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <Button onClick={handleSearch}>
                                <Search className="mr-2 h-4 w-4" />
                                Search
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-4">
                    {/* Filters Sidebar */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Vehicle Type */}
                            <div>
                                <label className="text-sm font-medium">Vehicle Type</label>
                                <Select value={selectedFilters.vehicle_type} onValueChange={(value) =>
                                    setSelectedFilters(prev => ({ ...prev, vehicle_type: value }))
                                }>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Any vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Any vehicle</SelectItem>
                                        {filters.vehicle_types.map(type => (
                                            <SelectItem key={type} value={type}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Price Range */}
                            <div>
                                <label className="text-sm font-medium">Price Range</label>
                                <Select value={selectedFilters.price_range} onValueChange={(value) =>
                                    setSelectedFilters(prev => ({ ...prev, price_range: value }))
                                }>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Any price" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Any price</SelectItem>
                                        {filters.price_ranges.map(range => (
                                            <SelectItem key={range.label} value={`${range.min}-${range.max}`}>
                                                {range.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Amenities */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Amenities</label>
                                <div className="space-y-2">
                                    {filters.amenities.map(amenity => (
                                        <div key={amenity} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={amenity}
                                                checked={selectedFilters.amenities.includes(amenity)}
                                                onChange={() => toggleAmenity(amenity)}
                                                className="rounded border-gray-300"
                                            />
                                            <label htmlFor={amenity} className="text-sm">
                                                {amenity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button variant="outline" className="w-full" onClick={() =>
                                setSelectedFilters({ vehicle_type: '', amenities: [], price_range: '' })
                            }>
                                Clear Filters
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Results */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground">
                                {slots.length} parking {slots.length === 1 ? 'spot' : 'spots'} found
                            </p>
                        </div>

                        {slots.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No parking spots found</h3>
                                    <p className="text-muted-foreground">
                                        Try adjusting your search location or filters
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {slots.map(slot => (
                                    <ParkingSlotCard key={slot.id} slot={slot} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function ParkingSlotCard({ slot }: { slot: ParkingSlot }) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">Slot {slot.slot_number}</h3>
                            <Badge variant={slot.status === 'available' ? 'default' : 'secondary'}>
                                {slot.status}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-1 text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{slot.address}</span>
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium">₱{slot.base_hourly_rate}/hour</span>
                            </div>
                            {slot.distance_meters && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm">{slot.estimated_walk_time_minutes} min walk</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">4.5</span>
                            </div>
                        </div>

                        {slot.amenities && slot.amenities.length > 0 && (
                            <div className="flex gap-1 flex-wrap mb-3">
                                {slot.amenities.slice(0, 3).map(amenity => (
                                    <Badge key={amenity} variant="outline" className="text-xs">
                                        {amenity.replace('_', ' ')}
                                    </Badge>
                                ))}
                                {slot.amenities.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                        +{slot.amenities.length - 3} more
                                    </Badge>
                                )}
                            </div>
                        )}

                        {slot.owner && (
                            <p className="text-sm text-muted-foreground">
                                Hosted by {slot.owner.first_name} {slot.owner.last_name}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                        <Link href={`/parking/${slot.id}`}>
                            <Button>
                                View Details
                            </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                            <MapPin className="h-3 w-3 mr-1" />
                            Directions
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}