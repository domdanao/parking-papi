import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import MapLocationPicker from '@/components/google-maps/map-location-picker';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    MapPin,
    Car,
    Banknote,
    Camera,
    ChevronLeft,
    ChevronRight,
    Building,
    Clock,
    Accessibility,
    Shield,
    Zap
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'My Parking Slots',
        href: '/slots',
    },
    {
        title: 'Add New Slot',
        href: '/slots/create',
    },
];

interface SlotFormData {
    // Step 1: Location & Basic Info
    slot_number: string;
    latitude: string;
    longitude: string;
    address: string;
    landmark_references: string;

    // Step 2: Physical Specifications
    dimensions: {
        length: string;
        width: string;
        height?: string;
    };
    surface_type: string;
    accessibility_features: string[];
    vehicle_compatibility: string[];
    amenities: string[];

    // Step 3: Pricing & Availability
    base_hourly_rate: string;
    minimum_duration_minutes: string;
    maximum_duration_minutes: string;

    // Step 4: Additional Info
    special_conditions: string;
}

const initialFormData: SlotFormData = {
    slot_number: '',
    latitude: '',
    longitude: '',
    address: '',
    landmark_references: '',
    dimensions: {
        length: '',
        width: '',
        height: '',
    },
    surface_type: '',
    accessibility_features: [],
    vehicle_compatibility: [],
    amenities: [],
    base_hourly_rate: '',
    minimum_duration_minutes: '30',
    maximum_duration_minutes: '480',
    special_conditions: '',
};

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

export default function CreateSlot() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<SlotFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalSteps = 4;

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

    const handleLocationChange = (location: { lat: number; lng: number; address?: string }) => {
        setFormData(prev => ({
            ...prev,
            latitude: location.lat.toString(),
            longitude: location.lng.toString(),
            address: location.address || prev.address
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

    const validateStep = (step: number): boolean => {
        const stepErrors: Record<string, string[]> = {};

        switch (step) {
            case 1:
                if (!formData.slot_number.trim()) {
                    stepErrors.slot_number = ['Slot number is required'];
                }
                if (!formData.latitude.trim()) {
                    stepErrors.latitude = ['Latitude is required'];
                }
                if (!formData.longitude.trim()) {
                    stepErrors.longitude = ['Longitude is required'];
                }
                if (!formData.address.trim()) {
                    stepErrors.address = ['Address is required'];
                }
                break;
            case 2:
                if (!formData.dimensions.length.trim()) {
                    stepErrors['dimensions.length'] = ['Length is required'];
                }
                if (!formData.dimensions.width.trim()) {
                    stepErrors['dimensions.width'] = ['Width is required'];
                }
                if (!formData.surface_type) {
                    stepErrors.surface_type = ['Surface type is required'];
                }
                if (formData.vehicle_compatibility.length === 0) {
                    stepErrors.vehicle_compatibility = ['At least one vehicle type is required'];
                }
                break;
            case 3:
                if (!formData.base_hourly_rate.trim()) {
                    stepErrors.base_hourly_rate = ['Hourly rate is required'];
                }
                break;
        }

        setErrors(stepErrors);
        return Object.keys(stepErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps));
        }
    };

    const previousStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

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

            router.post('/api/parking-slots', submitData, {
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

    const getStepIcon = (step: number) => {
        switch (step) {
            case 1: return MapPin;
            case 2: return Car;
            case 3: return Banknote;
            case 4: return Camera;
            default: return MapPin;
        }
    };

    const getStepTitle = (step: number) => {
        switch (step) {
            case 1: return 'Location & Basic Info';
            case 2: return 'Physical Specifications';
            case 3: return 'Pricing & Availability';
            case 4: return 'Additional Details';
            default: return '';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add New Parking Slot" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-gray-50 dark:bg-slate-900">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Add New Parking Slot</h1>
                    <p className="text-gray-600 dark:text-slate-400">Create a new parking slot to start earning revenue</p>
                </div>

                {/* Progress Indicator */}
                <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            {Array.from({ length: totalSteps }, (_, index) => {
                                const step = index + 1;
                                const Icon = getStepIcon(step);
                                const isActive = step === currentStep;
                                const isCompleted = step < currentStep;

                                return (
                                    <div key={step} className="flex items-center">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                                            isActive
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : isCompleted
                                                    ? 'border-green-500 bg-green-500 text-white'
                                                    : 'border-muted bg-muted text-muted-foreground'
                                        }`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="ml-3 hidden sm:block">
                                            <div className={`text-sm font-medium ${
                                                isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                                            }`}>
                                                Step {step}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {getStepTitle(step)}
                                            </div>
                                        </div>
                                        {index < totalSteps - 1 && (
                                            <div className={`w-8 h-0.5 mx-4 ${
                                                isCompleted ? 'bg-green-500' : 'bg-muted'
                                            }`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Step Content */}
                <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-slate-100">
                            {(() => {
                                const Icon = getStepIcon(currentStep);
                                return <Icon className="h-5 w-5" />;
                            })()}
                            {getStepTitle(currentStep)}
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-slate-400">
                            {currentStep === 1 && 'Enter the location and basic information for your parking slot'}
                            {currentStep === 2 && 'Specify the physical characteristics and features of your slot'}
                            {currentStep === 3 && 'Set your pricing and availability preferences'}
                            {currentStep === 4 && 'Add any additional details and special conditions'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Step 1: Location & Basic Info */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="slot_number">Slot Number/ID</Label>
                                    <Input
                                        id="slot_number"
                                        placeholder="e.g., A-12, Downtown-05"
                                        value={formData.slot_number}
                                        onChange={(e) => updateFormData('slot_number', e.target.value)}
                                        className="max-w-md"
                                    />
                                    {errors.slot_number && (
                                        <p className="text-sm text-destructive">{errors.slot_number[0]}</p>
                                    )}
                                </div>

                                {/* Google Maps Integration */}
                                <div className="space-y-2">
                                    <Label>Parking Slot Location</Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Use the map below to select the exact location of your parking slot. You can search for an address, use your current location, or click directly on the map.
                                    </p>

                                    <MapLocationPicker
                                        initialLocation={
                                            formData.latitude && formData.longitude
                                                ? {
                                                      lat: parseFloat(formData.latitude),
                                                      lng: parseFloat(formData.longitude),
                                                      address: formData.address
                                                  }
                                                : undefined
                                        }
                                        onLocationChange={handleLocationChange}
                                        height="400px"
                                    />
                                </div>

                                {/* Manual Address Override */}
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address (auto-filled from map)</Label>
                                    <Input
                                        id="address"
                                        placeholder="Address will be filled automatically when you select a location on the map"
                                        value={formData.address}
                                        onChange={(e) => updateFormData('address', e.target.value)}
                                    />
                                    {errors.address && (
                                        <p className="text-sm text-destructive">{errors.address[0]}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        You can edit the address if needed, or it will be automatically filled from the map selection
                                    </p>
                                </div>

                                {/* Coordinates Display (Read-only) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Latitude</Label>
                                        <Input
                                            value={formData.latitude || 'Select location on map'}
                                            readOnly
                                            className="bg-muted"
                                        />
                                        {errors.latitude && (
                                            <p className="text-sm text-destructive">{errors.latitude[0]}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Longitude</Label>
                                        <Input
                                            value={formData.longitude || 'Select location on map'}
                                            readOnly
                                            className="bg-muted"
                                        />
                                        {errors.longitude && (
                                            <p className="text-sm text-destructive">{errors.longitude[0]}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="landmark_references">Landmark References (Optional)</Label>
                                    <Textarea
                                        id="landmark_references"
                                        placeholder="Additional details like 'Next to Starbucks', 'Blue building', 'Near main entrance'..."
                                        value={formData.landmark_references}
                                        onChange={(e) => updateFormData('landmark_references', e.target.value)}
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Help customers find your slot with additional reference points
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Physical Specifications */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-base font-medium">Dimensions (meters)</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="length">Length *</Label>
                                            <Input
                                                id="length"
                                                type="number"
                                                step="0.1"
                                                placeholder="5.0"
                                                value={formData.dimensions.length}
                                                onChange={(e) => updateNestedFormData('dimensions', 'length', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="width">Width *</Label>
                                            <Input
                                                id="width"
                                                type="number"
                                                step="0.1"
                                                placeholder="2.5"
                                                value={formData.dimensions.width}
                                                onChange={(e) => updateNestedFormData('dimensions', 'width', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="height">Height (optional)</Label>
                                            <Input
                                                id="height"
                                                type="number"
                                                step="0.1"
                                                placeholder="2.5"
                                                value={formData.dimensions.height}
                                                onChange={(e) => updateNestedFormData('dimensions', 'height', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {errors['dimensions.length'] && (
                                        <p className="text-sm text-destructive mt-1">{errors['dimensions.length'][0]}</p>
                                    )}
                                    {errors['dimensions.width'] && (
                                        <p className="text-sm text-destructive mt-1">{errors['dimensions.width'][0]}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Surface Type *</Label>
                                    <Select value={formData.surface_type} onValueChange={(value) => updateFormData('surface_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select surface type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SURFACE_TYPES.map(type => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.surface_type && (
                                        <p className="text-sm text-destructive">{errors.surface_type[0]}</p>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-base font-medium">Vehicle Compatibility *</Label>
                                    <p className="text-sm text-muted-foreground mb-3">Select all vehicle types that can use this slot</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                                    {errors.vehicle_compatibility && (
                                        <p className="text-sm text-destructive mt-1">{errors.vehicle_compatibility[0]}</p>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-base font-medium">Accessibility Features</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                        {ACCESSIBILITY_FEATURES.map(feature => {
                                            const Icon = feature.icon;
                                            return (
                                                <div key={feature.value} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={feature.value}
                                                        checked={formData.accessibility_features.includes(feature.value)}
                                                        onCheckedChange={() => toggleArrayValue('accessibility_features', feature.value)}
                                                    />
                                                    <Label htmlFor={feature.value} className="flex items-center gap-2 text-sm font-normal">
                                                        <Icon className="h-4 w-4" />
                                                        {feature.label}
                                                    </Label>
                                                </div>
                                            );
                                        })}
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
                            </div>
                        )}

                        {/* Step 3: Pricing & Availability */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="base_hourly_rate">Base Hourly Rate (PHP) *</Label>
                                    <div className="relative">
                                        <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="minimum_duration">Minimum Duration</Label>
                                        <Select value={formData.minimum_duration_minutes} onValueChange={(value) => updateFormData('minimum_duration_minutes', value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="15">15 minutes</SelectItem>
                                                <SelectItem value="30">30 minutes</SelectItem>
                                                <SelectItem value="60">1 hour</SelectItem>
                                                <SelectItem value="120">2 hours</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="maximum_duration">Maximum Duration</Label>
                                        <Select value={formData.maximum_duration_minutes} onValueChange={(value) => updateFormData('maximum_duration_minutes', value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="240">4 hours</SelectItem>
                                                <SelectItem value="480">8 hours</SelectItem>
                                                <SelectItem value="720">12 hours</SelectItem>
                                                <SelectItem value="1440">24 hours</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                                    <h4 className="font-medium mb-2 text-green-900 dark:text-green-100 flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        Earnings Estimate
                                    </h4>
                                    <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                        <div>If your slot is booked 4 hours per day:</div>
                                        <div className="font-medium text-green-900 dark:text-green-100">
                                            Daily: ₱{(parseFloat(formData.base_hourly_rate) * 4 || 0).toFixed(2)} •
                                            Monthly: ₱{(parseFloat(formData.base_hourly_rate) * 4 * 30 || 0).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-green-600 dark:text-green-400">*Estimates before platform commission</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Additional Details */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="special_conditions">Special Conditions</Label>
                                    <Textarea
                                        id="special_conditions"
                                        placeholder="Any special instructions, restrictions, or conditions for using this parking slot..."
                                        value={formData.special_conditions}
                                        onChange={(e) => updateFormData('special_conditions', e.target.value)}
                                        rows={4}
                                    />
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What happens next?</h4>
                                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                        <div>• Your slot will be submitted for review</div>
                                        <div>• Our team will verify the details within 24-48 hours</div>
                                        <div>• You'll receive a notification when approved</div>
                                        <div>• Once published, customers can start booking your slot</div>
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <h4 className="font-medium text-gray-900 dark:text-slate-100">Review Your Slot Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-slate-300">
                                        <div>
                                            <span className="font-medium">Slot Number:</span> {formData.slot_number}
                                        </div>
                                        <div>
                                            <span className="font-medium">Hourly Rate:</span> ₱{formData.base_hourly_rate}
                                        </div>
                                        <div>
                                            <span className="font-medium">Surface:</span> {SURFACE_TYPES.find(s => s.value === formData.surface_type)?.label}
                                        </div>
                                        <div>
                                            <span className="font-medium">Vehicle Types:</span> {formData.vehicle_compatibility.length}
                                        </div>
                                        {formData.amenities.length > 0 && (
                                            <div className="md:col-span-2">
                                                <span className="font-medium">Amenities:</span>
                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                    {formData.amenities.map(amenity => (
                                                        <Badge key={amenity} variant="outline" className="text-xs">
                                                            {AMENITIES.find(a => a.value === amenity)?.label}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={previousStep}
                        disabled={currentStep === 1}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                    </Button>

                    {currentStep < totalSteps ? (
                        <Button onClick={nextStep}>
                            Next
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'Creating Slot...' : 'Create Slot'}
                        </Button>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}