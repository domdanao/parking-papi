import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ParkingSlot } from '@/types';
import { Head, router } from '@inertiajs/react';
import MapLocationPicker from '@/components/google-maps/map-location-picker';
import {
    MapPin,
    Car,
    DollarSign,
    Camera,
    Save,
    ArrowLeft,
    Building,
    Clock,
    Accessibility,
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

const SURFACE_TYPES = [
    { value: 'asphalt', label: 'Asphalt' },
    { value: 'concrete', label: 'Concrete' },
    { value: 'gravel', label: 'Gravel' },
    { value: 'paved', label: 'Paved' },
    { value: 'unpaved', label: 'Unpaved' },
];

const ACCESSIBILITY_FEATURES = [
    { value: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: Accessibility },
    { value: 'wide_space', label: 'Wide Space', icon: Car },
    { value: 'level_access', label: 'Level Access', icon: Building },
];

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
    const [formData, setFormData] = useState<SlotFormData>({
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

    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

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

    // Track changes
    useEffect(() => {
        setHasChanges(true);
    }, [formData]);

    const updateFormData = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const updateNestedFormData = (parent: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent as keyof SlotFormData],
                [field]: value
            }
        }));
    };

    const toggleArrayValue = (field: keyof SlotFormData, value: string) => {
        setFormData(prev => {
            const currentArray = prev[field] as string[];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];

            return {
                ...prev,
                [field]: newArray
            };
        });
    };

    const handleLocationChange = (location: { lat: number; lng: number; address?: string }) => {
        setFormData(prev => ({
            ...prev,
            latitude: location.lat.toString(),
            longitude: location.lng.toString(),
            address: location.address || prev.address
        }));
    };

    const validateForm = (): boolean => {
        const formErrors: Record<string, string[]> = {};

        if (!formData.slot_number.trim()) {
            formErrors.slot_number = ['Slot number is required'];
        }
        if (!formData.address.trim()) {
            formErrors.address = ['Address is required'];
        }
        if (!formData.base_hourly_rate.trim()) {
            formErrors.base_hourly_rate = ['Hourly rate is required'];
        }

        setErrors(formErrors);
        return Object.keys(formErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            // Transform form data for API
            const submitData = {
                slot_number: formData.slot_number,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                address: formData.address,
                landmark_references: formData.landmark_references,
                dimensions: {
                    length: parseFloat(formData.dimensions.length),
                    width: parseFloat(formData.dimensions.width),
                    height: formData.dimensions.height ? parseFloat(formData.dimensions.height) : undefined,
                },
                surface_type: formData.surface_type,
                accessibility_features: formData.accessibility_features,
                vehicle_compatibility: formData.vehicle_compatibility,
                amenities: formData.amenities,
                base_hourly_rate: parseFloat(formData.base_hourly_rate),
                minimum_duration_minutes: parseInt(formData.minimum_duration_minutes),
                maximum_duration_minutes: parseInt(formData.maximum_duration_minutes),
                special_conditions: formData.special_conditions,
            };

            router.put(`/api/parking-slots/${slot.id}`, submitData, {
                onSuccess: () => {
                    router.visit('/slots');
                },
                onError: (errors) => {
                    setErrors(errors);
                    setIsSubmitting(false);
                }
            });
        } catch (error) {
            setIsSubmitting(false);
        }
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
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Edit Parking Slot</h1>
                        <p className="text-muted-foreground">Update your parking slot details</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant={getStatusBadgeVariant(slot.approval_status)}>
                            {slot.approval_status.replace('_', ' ')}
                        </Badge>
                        <Button variant="outline" onClick={() => router.visit('/slots')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Slots
                        </Button>
                    </div>
                </div>

                {/* Status Alert */}
                {slot.approval_status === 'rejected' && (
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
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
                                            value={formData.slot_number}
                                            onChange={(e) => updateFormData('slot_number', e.target.value)}
                                        />
                                        {errors.slot_number && (
                                            <p className="text-sm text-destructive">{errors.slot_number[0]}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="base_hourly_rate">Hourly Rate (PHP)</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="base_hourly_rate"
                                                type="number"
                                                step="0.01"
                                                placeholder="5.00"
                                                className="pl-10"
                                                value={formData.base_hourly_rate}
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
                                        value={formData.address}
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
                                        value={formData.landmark_references}
                                        onChange={(e) => updateFormData('landmark_references', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Location */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Location
                                </CardTitle>
                                <CardDescription>
                                    Pin your parking slot location on the map. This helps customers find your slot easily.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MapLocationPicker
                                    initialLocation={{
                                        lat: parseFloat(formData.latitude) || 14.5995,
                                        lng: parseFloat(formData.longitude) || 120.9842,
                                        address: formData.address
                                    }}
                                    onLocationChange={handleLocationChange}
                                    height="400px"
                                />
                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Latitude</Label>
                                        <div className="font-mono text-sm">{formData.latitude}</div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Longitude</Label>
                                        <div className="font-mono text-sm">{formData.longitude}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Vehicle Compatibility & Amenities */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Car className="h-5 w-5" />
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
                                                    checked={formData.vehicle_compatibility.includes(vehicle.value)}
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
                                                        checked={formData.amenities.includes(amenity.value)}
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
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Camera className="h-5 w-5" />
                                    Additional Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label htmlFor="special_conditions">Special Conditions</Label>
                                    <Textarea
                                        id="special_conditions"
                                        placeholder="Any special instructions, restrictions, or conditions..."
                                        value={formData.special_conditions}
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
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Slot Status</CardTitle>
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
                        {formData.base_hourly_rate && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Earnings Estimate</CardTitle>
                                    <CardDescription>Based on your hourly rate</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm">
                                        <div className="flex justify-between">
                                            <span>4 hours/day:</span>
                                            <span className="font-medium">₱{(parseFloat(formData.base_hourly_rate) * 4 || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Monthly (4h/day):</span>
                                            <span className="font-medium">₱{(parseFloat(formData.base_hourly_rate) * 4 * 30 || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">*Before platform commission</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !hasChanges}
                                        className="w-full"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                                    </Button>

                                    {hasChanges && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            Changes will reset approval status to "submitted"
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}