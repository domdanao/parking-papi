import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ParkingSlot } from '@/types';
import { Head, router } from '@inertiajs/react';
import { MapPin, Clock, DollarSign, Star, User, Camera, Car, Shield, Zap } from 'lucide-react';
import { useState } from 'react';

interface ParkingSlotDetailProps {
    slot: ParkingSlot;
}

export default function ParkingSlotDetail({ slot }: ParkingSlotDetailProps) {
    const [bookingData, setBookingData] = useState({
        duration: '2',
        start_time: '',
        payment_method: 'wallet'
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Find Parking',
            href: '/parking/search',
        },
        {
            title: `Slot ${slot.slot_number}`,
            href: `/parking/${slot.id}`,
        },
    ];

    const calculateTotal = () => {
        const hours = parseFloat(bookingData.duration);
        return (hours * slot.base_hourly_rate).toFixed(2);
    };

    const handleBooking = () => {
        // In a real implementation, this would trigger the QR scanning/booking flow
        router.post('/api/qr/scan', {
            qr_data: btoa(JSON.stringify({ slot_id: slot.id })),
            location: {
                latitude: slot.latitude,
                longitude: slot.longitude,
                accuracy: 10.0
            },
            scan_timestamp: new Date().toISOString()
        });
    };

    const getAmenityIcon = (amenity: string) => {
        switch (amenity) {
            case 'covered':
                return <Shield className="h-4 w-4" />;
            case 'ev_charging':
                return <Zap className="h-4 w-4" />;
            case 'secured':
                return <Shield className="h-4 w-4" />;
            default:
                return <Car className="h-4 w-4" />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Parking Slot ${slot.slot_number}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h1 className="text-3xl font-bold">Slot {slot.slot_number}</h1>
                                            <Badge variant={slot.status === 'available' ? 'default' : 'secondary'}>
                                                {slot.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-muted-foreground mb-2">
                                            <MapPin className="h-4 w-4" />
                                            <span>{slot.address}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                <span className="font-medium text-lg">${slot.base_hourly_rate}/hour</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-4 w-4 text-yellow-500" />
                                                <span>4.5 (12 reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Photos */}
                                {slot.photos && slot.photos.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <Camera className="h-4 w-4" />
                                            Photos
                                        </h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {slot.photos.slice(0, 3).map((photo, index) => (
                                                <div key={index} className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                                    <Camera className="h-8 w-8 text-gray-400" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Amenities */}
                                {slot.amenities && slot.amenities.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="font-semibold mb-3">Amenities</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {slot.amenities.map(amenity => (
                                                <div key={amenity} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                                    {getAmenityIcon(amenity)}
                                                    <span className="text-sm">
                                                        {amenity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Vehicle Compatibility */}
                                {slot.vehicle_compatibility && slot.vehicle_compatibility.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3">Vehicle Compatibility</h3>
                                        <div className="flex gap-2 flex-wrap">
                                            {slot.vehicle_compatibility.map(vehicle => (
                                                <Badge key={vehicle} variant="outline">
                                                    {vehicle.charAt(0).toUpperCase() + vehicle.slice(1)}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Host Information */}
                        {slot.owner && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Hosted by {slot.owner.first_name} {slot.owner.last_name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                            <User className="h-6 w-6 text-gray-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <Star className="h-4 w-4 text-yellow-500" />
                                                <span className="font-medium">4.8</span>
                                                <span className="text-muted-foreground">• 23 reviews</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Hosting since 2023
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Location Map Placeholder */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Location</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                    <div className="text-center">
                                        <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Map integration would go here</p>
                                        <p className="text-xs text-gray-400">
                                            {slot.latitude.toFixed(6)}, {slot.longitude.toFixed(6)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Booking Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle>Book This Spot</CardTitle>
                                <CardDescription>Reserve your parking slot</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="duration">Duration (hours)</Label>
                                    <Select value={bookingData.duration} onValueChange={(value) =>
                                        setBookingData(prev => ({ ...prev, duration: value }))
                                    }>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0.5">30 minutes</SelectItem>
                                            <SelectItem value="1">1 hour</SelectItem>
                                            <SelectItem value="2">2 hours</SelectItem>
                                            <SelectItem value="3">3 hours</SelectItem>
                                            <SelectItem value="4">4 hours</SelectItem>
                                            <SelectItem value="8">8 hours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="start_time">Start Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={bookingData.start_time}
                                        onChange={(e) => setBookingData(prev => ({ ...prev, start_time: e.target.value }))}
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="payment_method">Payment Method</Label>
                                    <Select value={bookingData.payment_method} onValueChange={(value) =>
                                        setBookingData(prev => ({ ...prev, payment_method: value }))
                                    }>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="wallet">Digital Wallet</SelectItem>
                                            <SelectItem value="card">Credit Card</SelectItem>
                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span>Subtotal:</span>
                                        <span>${calculateTotal()}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span>Service fee:</span>
                                        <span>$0.50</span>
                                    </div>
                                    <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
                                        <span>Total:</span>
                                        <span>${(parseFloat(calculateTotal()) + 0.50).toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleBooking}
                                    disabled={slot.status !== 'available'}
                                >
                                    {slot.status === 'available' ? 'Book Now' : 'Not Available'}
                                </Button>

                                <p className="text-xs text-muted-foreground text-center">
                                    You'll scan a QR code to confirm your arrival
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}