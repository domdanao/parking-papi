import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, ParkingSlot, ParkingSchedule } from '@/types';

interface Props {
    slots: ParkingSlot[];
    recentSchedules: ParkingSchedule[];
    stats: {
        total_slots: number;
        scheduled_slots: number;
        active_schedules: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Schedule Management',
        href: '/schedules',
    },
];

export default function ScheduleIndex({ slots, recentSchedules, stats }: Props) {
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

    const handleBulkSchedule = () => {
        if (selectedSlots.length === 0) {
            alert('Please select at least one slot');
            return;
        }

        router.visit('/schedules/create?slots=' + selectedSlots.join(','));
    };

    const toggleSlotSelection = (slotId: string) => {
        setSelectedSlots(prev =>
            prev.includes(slotId)
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Schedule Management" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-gray-50 dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Schedule Management</h1>
                        <p className="text-gray-600 dark:text-slate-300">Manage pricing schedules for your parking slots</p>
                    </div>
                    <Link
                        href="/schedules/create"
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm px-4 py-2 rounded-md"
                    >
                        Create Schedule
                    </Link>
                </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">{stats.total_slots}</span>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Slots</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.total_slots}</dd>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">{stats.scheduled_slots}</span>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <dt className="text-sm font-medium text-gray-500 truncate">Scheduled Slots</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.scheduled_slots}</dd>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">{stats.active_schedules}</span>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <dt className="text-sm font-medium text-gray-500 truncate">Active Schedules</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.active_schedules}</dd>
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Slots List */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 bg-white border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">Your Parking Slots</h3>
                                    {selectedSlots.length > 0 && (
                                        <button
                                            onClick={handleBulkSchedule}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                        >
                                            Create Schedule for {selectedSlots.length} slot(s)
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {slots.map((slot) => (
                                    <div key={slot.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSlots.includes(slot.id)}
                                                    onChange={() => toggleSlotSelection(slot.id)}
                                                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        Slot #{slot.slot_number}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Base Rate: ₱{slot.base_hourly_rate}/hour
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {slot.parking_schedules_count} schedule(s)
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <Link
                                                    href={`/schedules/${slot.id}/schedules`}
                                                    className="text-blue-600 hover:text-blue-900 text-sm"
                                                >
                                                    Manage Schedules
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Schedules */}
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 bg-white border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Recent Schedules</h3>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {recentSchedules.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        No schedules created yet
                                    </div>
                                ) : (
                                    recentSchedules.map((schedule) => (
                                        <div key={schedule.id} className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {schedule.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Slot #{schedule.parking_slot_id}
                                                    </div>
                                                    <div className="flex items-center mt-1">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            schedule.schedule_type === 'pricing_tier' ? 'bg-blue-100 text-blue-800' :
                                                            schedule.schedule_type === 'free_period' ? 'bg-green-100 text-green-800' :
                                                            schedule.schedule_type === 'restriction_zone' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {schedule.schedule_type.replace('_', ' ')}
                                                        </span>
                                                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {schedule.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/schedules/${schedule.id}/edit`}
                                                    className="text-blue-600 hover:text-blue-900 text-sm"
                                                >
                                                    Edit
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}