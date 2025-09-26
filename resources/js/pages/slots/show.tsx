import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import MapDisplay from '@/components/google-maps/map-display';
import QRCodeModal from '@/components/ui/qr-code-modal';
import { type BreadcrumbItem, type ParkingSlot, type ParkingSession } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    MapPin,
    Banknote,
    Edit,
    ArrowLeft,
    Building,
    Car,
    Clock,
    TrendingUp,
    Users,
    Calendar,
    Accessibility,
    Shield,
    Zap,
    QrCode,
    Download,
    Share
} from 'lucide-react';

interface SlotShowProps {
    slot: ParkingSlot & {
        parkingSessions?: ParkingSession[];
        landmark_references?: string;
        dimensions?: {
            length: number;
            width: number;
            height?: number;
        };
        surface_type?: string;
        accessibility_features?: string[];
        minimum_duration_minutes?: number;
        maximum_duration_minutes?: number;
        special_conditions?: string;
    };
    metrics: {
        total_sessions: number;
        total_revenue: number;
        occupancy_rate: number;
    };
}

const AMENITY_ICONS: Record<string, any> = {
    covered: Shield,
    security_camera: Shield,
    lighting: Zap,
    ev_charging: Zap,
    secured: Shield,
};

const ACCESSIBILITY_ICONS: Record<string, any> = {
    wheelchair_accessible: Accessibility,
    wide_space: Car,
    level_access: Building,
};

export default function ShowSlot({ slot, metrics }: SlotShowProps) {
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'My Parking Slots',
            href: '/slots',
        },
        {
            title: `Slot ${slot.slot_number}`,
            href: `/slots/${slot.id}`,
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'default';
            case 'occupied': return 'destructive';
            case 'reserved': return 'secondary';
            case 'maintenance': return 'outline';
            default: return 'outline';
        }
    };

    const getApprovalColor = (status: string) => {
        switch (status) {
            case 'published': return 'default';
            case 'approved': return 'default';
            case 'under_review': return 'secondary';
            case 'submitted': return 'outline';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Slot ${slot.slot_number}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-blue-50 dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Slot {slot.slot_number}</h1>
                            <Badge variant={getStatusColor(slot.status)}>
                                {slot.status}
                            </Badge>
                            <Badge variant={getApprovalColor(slot.approval_status)}>
                                {slot.approval_status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-slate-300">
                            <MapPin className="h-4 w-4 text-blue-500" />
                            <span>{slot.address}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600">
                            <Share className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsQRModalOpen(true)}
                            className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600"
                        >
                            <QrCode className="mr-2 h-4 w-4" />
                            View QR Code
                        </Button>
                        <Link href={`/slots/${slot.id}/edit`}>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Slot
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={() => window.history.back()} className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Performance Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-700">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Revenue</p>
                                            <p className="text-2xl font-bold text-green-800 dark:text-green-100">{formatCurrency(metrics.total_revenue)}</p>
                                        </div>
                                        <div className="p-3 bg-green-200 dark:bg-green-700 rounded-full">
                                            <Banknote className="h-6 w-6 text-green-700 dark:text-green-200" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-700">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Sessions</p>
                                            <p className="text-2xl font-bold text-blue-800 dark:text-blue-100">{metrics.total_sessions}</p>
                                        </div>
                                        <div className="p-3 bg-blue-200 dark:bg-blue-700 rounded-full">
                                            <Users className="h-6 w-6 text-blue-700 dark:text-blue-200" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200 dark:border-purple-700">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Occupancy Rate</p>
                                            <p className="text-2xl font-bold text-purple-800 dark:text-purple-100">{metrics.occupancy_rate}%</p>
                                        </div>
                                        <div className="p-3 bg-purple-200 dark:bg-purple-700 rounded-full">
                                            <TrendingUp className="h-6 w-6 text-purple-700 dark:text-purple-200" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Location Map */}
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-slate-100">
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                    Location
                                </CardTitle>
                                <CardDescription className="text-blue-600 dark:text-slate-300">
                                    Exact parking slot location
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MapDisplay
                                    location={{
                                        lat: Number(slot.latitude),
                                        lng: Number(slot.longitude),
                                        title: `Slot ${slot.slot_number}`
                                    }}
                                    height="350px"
                                    showInfoWindow={true}
                                    zoom={17}
                                />
                                <div className="mt-3 p-3 bg-blue-100 dark:bg-slate-700/50 rounded-lg border border-blue-200 dark:border-slate-600">
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <span className="font-medium text-blue-800 dark:text-slate-100">{slot.address}</span>
                                    </div>
                                    {slot.landmark_references && (
                                        <p className="text-sm text-blue-700 dark:text-slate-300 mt-1">
                                            <span className="font-medium">Landmarks:</span> {slot.landmark_references}
                                        </p>
                                    )}
                                    <p className="text-xs text-blue-600 dark:text-slate-400 mt-2">
                                        Coordinates: {typeof slot.latitude === 'number' ? slot.latitude.toFixed(6) : Number(slot.latitude).toFixed(6)}, {typeof slot.longitude === 'number' ? slot.longitude.toFixed(6) : Number(slot.longitude).toFixed(6)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Slot Details */}
                        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-slate-800 dark:to-slate-700 border-orange-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-slate-100">
                                    <Building className="h-5 w-5 text-orange-600" />
                                    Slot Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium mb-2 text-orange-800 dark:text-slate-100">Pricing</h4>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-orange-600 dark:text-slate-400">Base Rate:</span>
                                                    <span className="font-medium text-green-700 dark:text-green-300">{formatCurrency(slot.base_hourly_rate)}/hour</span>
                                                </div>
                                                {slot.minimum_duration_minutes && (
                                                    <div className="flex justify-between">
                                                        <span>Minimum Duration:</span>
                                                        <span>{formatDuration(slot.minimum_duration_minutes)}</span>
                                                    </div>
                                                )}
                                                {slot.maximum_duration_minutes && (
                                                    <div className="flex justify-between">
                                                        <span>Maximum Duration:</span>
                                                        <span>{formatDuration(slot.maximum_duration_minutes)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {slot.dimensions && (
                                            <div>
                                                <h4 className="font-medium mb-2 text-orange-800 dark:text-slate-100">Dimensions</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-orange-600 dark:text-slate-400">Length:</span>
                                                        <span className="text-orange-800 dark:text-slate-200">{slot.dimensions.length}m</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-orange-600 dark:text-slate-400">Width:</span>
                                                        <span className="text-orange-800 dark:text-slate-200">{slot.dimensions.width}m</span>
                                                    </div>
                                                    {slot.dimensions.height && (
                                                        <div className="flex justify-between">
                                                            <span className="text-orange-600 dark:text-slate-400">Height:</span>
                                                            <span className="text-orange-800 dark:text-slate-200">{slot.dimensions.height}m</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium mb-2">Location</h4>
                                            <div className="space-y-1 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Coordinates:</span>
                                                    <br />
                                                    <span>{typeof slot.latitude === 'number' ? slot.latitude : Number(slot.latitude)}, {typeof slot.longitude === 'number' ? slot.longitude : Number(slot.longitude)}</span>
                                                </div>
                                                {slot.landmark_references && (
                                                    <div>
                                                        <span className="text-muted-foreground">Landmarks:</span>
                                                        <br />
                                                        <span>{slot.landmark_references}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {slot.surface_type && (
                                            <div>
                                                <h4 className="font-medium mb-2">Surface</h4>
                                                <Badge variant="outline" className="capitalize">
                                                    {slot.surface_type.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Vehicle Compatibility */}
                                {slot.vehicle_compatibility && slot.vehicle_compatibility.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2">Vehicle Compatibility</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            {slot.vehicle_compatibility.map(vehicle => (
                                                <Badge key={vehicle} variant="secondary" className="capitalize">
                                                    {vehicle.replace('_', ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Amenities */}
                                {slot.amenities && slot.amenities.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2">Amenities</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {slot.amenities.map(amenity => {
                                                const Icon = AMENITY_ICONS[amenity] || Shield;
                                                return (
                                                    <div key={amenity} className="flex items-center gap-2 text-sm">
                                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                                        <span className="capitalize">{amenity.replace('_', ' ')}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Accessibility Features */}
                                {slot.accessibility_features && slot.accessibility_features.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2">Accessibility Features</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {slot.accessibility_features.map(feature => {
                                                const Icon = ACCESSIBILITY_ICONS[feature] || Accessibility;
                                                return (
                                                    <div key={feature} className="flex items-center gap-2 text-sm">
                                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                                        <span className="capitalize">{feature.replace('_', ' ')}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Special Conditions */}
                                {slot.special_conditions && (
                                    <div>
                                        <h4 className="font-medium mb-2">Special Conditions</h4>
                                        <p className="text-sm text-muted-foreground">{slot.special_conditions}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 border-indigo-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-indigo-800 dark:text-slate-100">
                                    <Calendar className="h-5 w-5 text-indigo-600" />
                                    Recent Activity
                                </CardTitle>
                                <CardDescription className="text-indigo-600 dark:text-slate-300">
                                    Latest parking sessions for this slot
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {slot.parkingSessions && slot.parkingSessions.length > 0 ? (
                                    <div className="space-y-4">
                                        {slot.parkingSessions.map((session) => (
                                            <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${
                                                        session.status === 'completed' ? 'bg-green-500' :
                                                        session.status === 'active' ? 'bg-blue-500' :
                                                        session.status === 'cancelled' ? 'bg-red-500' :
                                                        'bg-gray-500'
                                                    }`} />
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            {formatDuration(session.duration_minutes)} session
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(session.start_time).toLocaleDateString()} - {session.status}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-sm">{formatCurrency(session.total_amount)}</p>
                                                    <p className="text-xs text-muted-foreground">{session.payment_status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">No parking sessions yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-700 border-emerald-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="text-lg text-emerald-800 dark:text-slate-100">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm"
                                    size="sm"
                                    onClick={() => setIsQRModalOpen(true)}
                                >
                                    <QrCode className="mr-2 h-4 w-4" />
                                    QR Code
                                </Button>
                                <Button variant="outline" className="w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600" size="sm">
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    View Analytics
                                </Button>
                                <Separator />
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-slate-400">Created:</span>
                                        <span className="text-gray-900 dark:text-slate-100">{new Date(slot.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-slate-400">Last Updated:</span>
                                        <span className="text-gray-900 dark:text-slate-100">{new Date(slot.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status Overview */}
                        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 border-rose-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="text-lg text-rose-800 dark:text-slate-100">Status Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-rose-600 dark:text-slate-400">Operational Status</span>
                                        <Badge variant={slot.is_active ? 'default' : 'secondary'}>
                                            {slot.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-rose-600 dark:text-slate-400">Current Status</span>
                                        <Badge variant={getStatusColor(slot.status)}>
                                            {slot.status}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-rose-600 dark:text-slate-400">Approval Status</span>
                                        <Badge variant={getApprovalColor(slot.approval_status)}>
                                            {slot.approval_status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>

                                {metrics.occupancy_rate > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Occupancy Rate</span>
                                            <span>{metrics.occupancy_rate}%</span>
                                        </div>
                                        <Progress value={metrics.occupancy_rate} className="h-2" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* QR Code Modal */}
            <QRCodeModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                slotId={slot.id}
                slotNumber={slot.slot_number}
            />
        </AppLayout>
    );
}