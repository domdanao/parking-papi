import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ParkingSlot } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Plus, MapPin, DollarSign, Edit, MoreHorizontal, Building } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'My Parking Slots',
        href: '/slots',
    },
];

interface SlotsIndexProps {
    slots: ParkingSlot[];
}

export default function SlotsIndex({ slots }: SlotsIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Parking Slots" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">My Parking Slots</h1>
                        <p className="text-muted-foreground">Manage your parking slots and track performance</p>
                    </div>
                    <Link href="/slots/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Slot
                        </Button>
                    </Link>
                </div>

                {slots.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No parking slots yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Start earning by adding your first parking slot
                            </p>
                            <Link href="/slots/create">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Your First Slot
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {slots.map(slot => (
                            <SlotCard key={slot.id} slot={slot} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function SlotCard({ slot }: { slot: ParkingSlot }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'default';
            case 'occupied':
                return 'destructive';
            case 'maintenance':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const getApprovalColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'default';
            case 'under_review':
                return 'secondary';
            case 'submitted':
                return 'outline';
            default:
                return 'destructive';
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Slot {slot.slot_number}</CardTitle>
                    <div className="flex gap-2">
                        <Badge variant={getStatusColor(slot.status)}>
                            {slot.status}
                        </Badge>
                        <Badge variant={getApprovalColor(slot.approval_status)}>
                            {slot.approval_status.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>
                <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {slot.address}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">₱{slot.base_hourly_rate}/hour</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {slot.is_active ? 'Active' : 'Inactive'}
                    </div>
                </div>

                {slot.amenities && slot.amenities.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                        {slot.amenities.slice(0, 3).map(amenity => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                                {amenity.replace('_', ' ')}
                            </Badge>
                        ))}
                        {slot.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{slot.amenities.length - 3}
                            </Badge>
                        )}
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <Link href={`/slots/${slot.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                            <Building className="mr-1 h-3 w-3" />
                            View
                        </Button>
                    </Link>
                    <Link href={`/slots/${slot.id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                        </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-3 w-3" />
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                    Created {new Date(slot.created_at).toLocaleDateString()}
                </div>
            </CardContent>
        </Card>
    );
}