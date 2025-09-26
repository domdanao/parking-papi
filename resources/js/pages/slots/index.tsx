import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ParkingSlot } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, MapPin, Banknote, Edit, MoreHorizontal, Building, Search, SortAsc, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'My Parking Slots',
        href: '/slots',
    },
];

interface SlotsIndexProps {
    slots: ParkingSlot[];
    search?: string;
    sort?: string;
}

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'slot_number', label: 'Slot Number (A-Z)' },
    { value: 'address', label: 'Address (A-Z)' },
    { value: 'rate_high', label: 'Highest Rate First' },
    { value: 'rate_low', label: 'Lowest Rate First' },
    { value: 'status', label: 'Status' },
    { value: 'approval', label: 'Approval Status' },
];

export default function SlotsIndex({ slots, search: initialSearch = '', sort: initialSort = 'newest' }: SlotsIndexProps) {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [sortBy, setSortBy] = useState(initialSort);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Update URL when search or sort changes
    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (sortBy !== 'newest') params.set('sort', sortBy);

        const url = `/slots${params.toString() ? '?' + params.toString() : ''}`;
        router.get(url, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });
    }, [debouncedSearch, sortBy]);
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Parking Slots" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-gray-50 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">My Parking Slots</h1>
                        <p className="text-gray-600 dark:text-slate-300">Manage your parking slots and track performance</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/schedules">
                            <Button variant="outline" className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700">
                                <Clock className="mr-2 h-4 w-4" />
                                Manage Schedules
                            </Button>
                        </Link>
                        <Link href="/slots/create">
                            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Slot
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search and Sort Controls */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search slots by number, address, or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-48 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600">
                                <SelectValue placeholder="Sort by..." />
                            </SelectTrigger>
                            <SelectContent>
                                {SORT_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {slots.length === 0 ? (
                    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                        <CardContent className="p-8 text-center">
                            <Building className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500 mb-4" />
                            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-slate-100">No parking slots yet</h3>
                            <p className="text-gray-600 dark:text-slate-300 mb-4">
                                Start earning by adding your first parking slot
                            </p>
                            <Link href="/slots/create">
                                <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm">
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
            case 'reserved':
                return 'secondary';
            case 'maintenance':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const getApprovalColor = (status: string) => {
        switch (status) {
            case 'published':
            case 'approved':
                return 'default';
            case 'under_review':
                return 'secondary';
            case 'submitted':
            case 'draft':
                return 'outline';
            case 'rejected':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-900 dark:text-slate-100">{slot.slot_number}</CardTitle>
                <div className="flex gap-2">
                    <Badge variant={getStatusColor(slot.status)} className="text-xs">
                        {slot.status}
                    </Badge>
                    <Badge
                        variant={getApprovalColor(slot.approval_status)}
                        className={`text-xs ${(slot.approval_status === 'published' || slot.approval_status === 'approved') ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' : ''}`}
                    >
                        {slot.approval_status.replace('_', ' ')}
                    </Badge>
                </div>
                <CardDescription className="flex items-start gap-1 text-gray-600 dark:text-slate-300">
                    <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{slot.address}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-1">
                        <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="font-semibold text-gray-900 dark:text-slate-100">₱{slot.base_hourly_rate}/hour</span>
                    </div>
                    <div className="text-sm">
                        <Badge variant={slot.is_active ? 'default' : 'secondary'} className="text-xs">
                            {slot.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </div>

                {slot.amenities && slot.amenities.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                        {slot.amenities.slice(0, 3).map(amenity => (
                            <Badge key={amenity} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                                {amenity.replace('_', ' ')}
                            </Badge>
                        ))}
                        {slot.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300">
                                +{slot.amenities.length - 3}
                            </Badge>
                        )}
                    </div>
                )}

                <div className="flex gap-1 pt-2">
                    <Link href={`/slots/${slot.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600">
                            <Building className="mr-1 h-3 w-3" />
                            View
                        </Button>
                    </Link>
                    <Link href={`/slots/${slot.id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600">
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                        </Button>
                    </Link>
                    <Link href={`/schedules/${slot.id}/schedules`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50">
                            <Clock className="mr-1 h-3 w-3" />
                            Schedule
                        </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600">
                        <MoreHorizontal className="h-3 w-3" />
                    </Button>
                </div>

                <div className="text-xs text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-100 dark:border-slate-700">
                    Created {new Date(slot.created_at).toLocaleDateString()}
                </div>
            </CardContent>
        </Card>
    );
}