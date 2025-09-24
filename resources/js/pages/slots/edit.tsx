import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ParkingSlot } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import MapLocationPicker from '@/components/google-maps/map-location-picker';
import {
    MapPin,
    Car,
    Banknote,
    Camera,
    Save,
    ArrowLeft,
    Clock,
    Shield,
    Zap,
    AlertTriangle
} from 'lucide-react';

interface SlotEditProps {
    slot: ParkingSlot;
}

interface SlotFormData {
    slot_number: string;
    latitude: string;
    longitude: string;
    address: string;
    landmark_references: string;
    dimensions: {
        length: string;
        width: string;
        height?: string;
    };
    surface_type: string;
    accessibility_features: string[];
    vehicle_compatibility: string[];
    amenities: string[];
    base_hourly_rate: string;
    minimum_duration_minutes: string;
    maximum_duration_minutes: string;
    special_conditions: string;
}


const VEHICLE_TYPES = [
    { value: 'compact', label: 'Compact Car' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'truck', label: 'Pickup Truck' },
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'van', label: 'Van' },
];

const AMENITIES = [
    { value: 'covered', label: 'Covered/Sheltered', icon: Shield },
    { value: 'security_camera', label: 'Security Camera', icon: Shield },
    { value: 'lighting', label: 'Well Lit', icon: Zap },
    { value: 'ev_charging', label: 'EV Charging', icon: Zap },
    { value: 'secured', label: 'Secured Area', icon: Shield },
];

export default function EditSlot({ slot }: SlotEditProps) {
    const { data, setData, put, processing, errors, isDirty } = useForm<SlotFormData>({
        slot_number: slot.slot_number || '',
        latitude: slot.latitude?.toString() || '',
        longitude: slot.longitude?.toString() || '',
        address: slot.address || '',
        landmark_references: (slot as any).landmark_references || '',
        dimensions: {
            length: (slot as any).dimensions?.length?.toString() || '',
            width: (slot as any).dimensions?.width?.toString() || '',
            height: (slot as any).dimensions?.height?.toString() || '',
        },
        surface_type: (slot as any).surface_type || '',
        accessibility_features: (slot as any).accessibility_features || [],
        vehicle_compatibility: slot.vehicle_compatibility || [],
        amenities: slot.amenities || [],
        base_hourly_rate: slot.base_hourly_rate?.toString() || '',
        minimum_duration_minutes: (slot as any).minimum_duration_minutes?.toString() || '30',
        maximum_duration_minutes: (slot as any).maximum_duration_minutes?.toString() || '480',
        special_conditions: (slot as any).special_conditions || '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'My Parking Slots',
            href: '/slots',
        },
        {
            title: `Edit Slot ${slot.slot_number}`,
            href: `/slots/${slot.id}/edit`,
        },
    ];

    const updateFormData = (field: keyof typeof data, value: any) => {
        setData(field, value);
    };

    const toggleArrayValue = (field: keyof SlotFormData, value: string) => {
        const currentArray = data[field] as string[];
        const newArray = currentArray.includes(value)
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value];
        setData(field, newArray);
    };

    const handleLocationChange = (location: { lat: number; lng: number; address?: string }) => {
        setData('latitude', location.lat.toString());
        setData('longitude', location.lng.toString());
        if (location.address) {
            setData('address', location.address);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Transform form data for submission
        const submitData = {
            ...data,
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            dimensions: {
                length: parseFloat(data.dimensions.length),
                width: parseFloat(data.dimensions.width),
                height: data.dimensions.height ? parseFloat(data.dimensions.height) : undefined,
            },
            base_hourly_rate: parseFloat(data.base_hourly_rate),
            minimum_duration_minutes: parseInt(data.minimum_duration_minutes),
            maximum_duration_minutes: parseInt(data.maximum_duration_minutes),
        };

        put(`/slots/${slot.id}`, {
            ...submitData,
            onSuccess: () => {
                // Redirect will be handled by the backend
            }
        });
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'published': return 'default';
            case 'approved': return 'default';
            case 'under_review': return 'secondary';
            case 'submitted': return 'outline';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Slot ${slot.slot_number}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-blue-50 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-900 dark:text-slate-100">Edit Parking Slot</h1>
                        <p className="text-blue-600 dark:text-slate-300">Update your parking slot details</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant={getStatusBadgeVariant(slot.approval_status)}>
                            {slot.approval_status.replace('_', ' ')}
                        </Badge>
                        <Link href="/slots">
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Slots
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Status Alert */}
                {(slot.approval_status as string) === 'rejected' && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            This slot has been rejected. Please review and update the details before resubmitting.
                        </AlertDescription>
                    </Alert>
                )}

                {slot.approval_status === 'under_review' && (
                    <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                            This slot is currently under review. Changes will reset the approval process.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 border-green-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-slate-100">
                                    <MapPin className="h-5 w-5 text-green-600" />
                                    Basic Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="slot_number">Slot Number/ID</Label>
                                        <Input
                                            id="slot_number"
                                            placeholder="e.g., A-12, Downtown-05"
                                            value={data.slot_number}
                                            onChange={(e) => updateFormData('slot_number', e.target.value)}
                                        />
                                        {errors.slot_number && (
                                            <p className="text-sm text-destructive">{errors.slot_number[0]}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="base_hourly_rate">Hourly Rate (PHP)</Label>
                                        <div className="relative">
                                            <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="base_hourly_rate"
                                                type="number"
                                                step="0.01"
                                                placeholder="5.00"
                                                className="pl-10"
                                                value={data.base_hourly_rate}
                                                onChange={(e) => updateFormData('base_hourly_rate', e.target.value)}
                                            />
                                        </div>
                                        {errors.base_hourly_rate && (
                                            <p className="text-sm text-destructive">{errors.base_hourly_rate[0]}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        placeholder="123 Main Street, City, State"
                                        value={data.address}
                                        onChange={(e) => updateFormData('address', e.target.value)}
                                    />
                                    {errors.address && (
                                        <p className="text-sm text-destructive">{errors.address[0]}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="landmark_references">Landmark References</Label>
                                    <Textarea
                                        id="landmark_references"
                                        placeholder="Next to Starbucks, blue building, near the main entrance..."
                                        value={data.landmark_references}
                                        onChange={(e) => updateFormData('landmark_references', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Location */}
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-slate-100">
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                    Location
                                </CardTitle>
                                <CardDescription className="text-blue-600 dark:text-slate-300">
                                    Pin your parking slot location on the map. This helps customers find your slot easily.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MapLocationPicker
                                    initialLocation={{
                                        lat: parseFloat(data.latitude) || 14.5995,
                                        lng: parseFloat(data.longitude) || 120.9842,
                                        address: data.address
                                    }}
                                    onLocationChange={handleLocationChange}
                                    height="400px"
                                />
                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label className="text-xs text-blue-600 dark:text-slate-400">Latitude</Label>
                                        <div className="font-mono text-sm text-blue-800 dark:text-slate-200">{data.latitude}</div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-blue-600 dark:text-slate-400">Longitude</Label>
                                        <div className="font-mono text-sm text-blue-800 dark:text-slate-200">{data.longitude}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Vehicle Compatibility & Amenities */}
                        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 border-purple-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-slate-100">
                                    <Car className="h-5 w-5 text-purple-600" />
                                    Vehicle Compatibility & Features
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label className="text-base font-medium">Vehicle Types</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                        {VEHICLE_TYPES.map(vehicle => (
                                            <div key={vehicle.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={vehicle.value}
                                                    checked={data.vehicle_compatibility.includes(vehicle.value)}
                                                    onCheckedChange={() => toggleArrayValue('vehicle_compatibility', vehicle.value)}
                                                />
                                                <Label htmlFor={vehicle.value} className="text-sm font-normal">
                                                    {vehicle.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-base font-medium">Amenities</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                        {AMENITIES.map(amenity => {
                                            const Icon = amenity.icon;
                                            return (
                                                <div key={amenity.value} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={amenity.value}
                                                        checked={data.amenities.includes(amenity.value)}
                                                        onCheckedChange={() => toggleArrayValue('amenities', amenity.value)}
                                                    />
                                                    <Label htmlFor={amenity.value} className="flex items-center gap-2 text-sm font-normal">
                                                        <Icon className="h-4 w-4" />
                                                        {amenity.label}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Special Conditions */}
                        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-slate-800 dark:to-slate-700 border-orange-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-slate-100">
                                    <Camera className="h-5 w-5 text-orange-600" />
                                    Additional Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label htmlFor="special_conditions">Special Conditions</Label>
                                    <Textarea
                                        id="special_conditions"
                                        placeholder="Any special instructions, restrictions, or conditions..."
                                        value={data.special_conditions}
                                        onChange={(e) => updateFormData('special_conditions', e.target.value)}
                                        rows={4}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Current Status */}
                        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 border-rose-200 dark:border-slate-600">
                            <CardHeader>
                                <CardTitle className="text-lg text-rose-800 dark:text-slate-100">Slot Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Approval Status:</span>
                                    <Badge variant={getStatusBadgeVariant(slot.approval_status)}>
                                        {slot.approval_status.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Active:</span>
                                    <Badge variant={slot.is_active ? 'default' : 'secondary'}>
                                        {slot.is_active ? 'Yes' : 'No'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Current Status:</span>
                                    <Badge variant="outline">
                                        {slot.status}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Earnings Preview */}
                        {data.base_hourly_rate && (
                            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-700 border-emerald-200 dark:border-slate-600">
                                <CardHeader>
                                    <CardTitle className="text-lg text-emerald-800 dark:text-slate-100">Earnings Estimate</CardTitle>
                                    <CardDescription className="text-emerald-600 dark:text-slate-300">Based on your hourly rate</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-emerald-700 dark:text-slate-300">4 hours/day:</span>
                                            <span className="font-medium text-green-700 dark:text-green-300">₱{(parseFloat(data.base_hourly_rate) * 4 || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-emerald-700 dark:text-slate-300">Monthly (4h/day):</span>
                                            <span className="font-medium text-green-700 dark:text-green-300">₱{(parseFloat(data.base_hourly_rate) * 4 * 30 || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">*Before platform commission</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 border-indigo-200 dark:border-slate-600">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <Button
                                        type="submit"
                                        disabled={processing || !isDirty}
                                        className="w-full"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {processing ? 'Saving Changes...' : 'Save Changes'}
                                    </Button>

                                    {isDirty && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            Changes will reset approval status to "submitted"
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                </form>
            </div>
        </AppLayout>
    );
}