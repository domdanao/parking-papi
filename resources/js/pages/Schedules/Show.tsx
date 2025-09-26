import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, ParkingSlot, ParkingSchedule } from '@/types';

interface ScheduleTemplate {
    id: string;
    name: string;
    description: string;
    schedule_type: string;
    time_rules: any;
    pricing_rules: any;
    recurrence_pattern: any;
}

interface Props {
    slot: ParkingSlot & { slotOwner: any };
    schedules: ParkingSchedule[];
    preview: {
        current_rates: any;
        upcoming_changes: any[];
    };
    schedule_templates: ScheduleTemplate[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Schedule Management',
        href: '/schedules',
    },
    {
        title: 'Slot Schedules',
        href: '#',
    },
];

export default function ScheduleShow({ slot, schedules, preview, schedule_templates }: Props) {
    const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);

    const toggleScheduleSelection = (scheduleId: string) => {
        setSelectedSchedules(prev =>
            prev.includes(scheduleId)
                ? prev.filter(id => id !== scheduleId)
                : [...prev, scheduleId]
        );
    };

    const handleBulkAction = (action: string) => {
        if (selectedSchedules.length === 0) {
            alert('Please select at least one schedule');
            return;
        }

        router.post('/schedules/bulk-update', {
            action,
            schedule_ids: selectedSchedules,
        });
    };

    const formatTimeRange = (timeRules: any) => {
        if (!timeRules) return 'N/A';

        const days = timeRules.days_of_week || [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayLabels = days.map((day: number) => dayNames[day]).join(', ');

        return `${dayLabels} ${timeRules.start_time || ''} - ${timeRules.end_time || ''}`;
    };

    const formatPricingRules = (schedule: ParkingSchedule) => {
        if (!schedule.pricing_rules) return 'N/A';

        switch (schedule.schedule_type) {
            case 'pricing_tier':
                return `₱${schedule.pricing_rules.hourly_rate}/hr`;
            case 'free_period':
                return schedule.pricing_rules.message || 'Free parking';
            case 'restriction_zone':
                return schedule.pricing_rules.restriction_message || 'No parking';
            default:
                return 'N/A';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Schedules - Slot ${slot.slot_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-gray-50 dark:bg-slate-900">
                <div className="max-w-7xl mx-auto w-full">
                    {/* Header */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Schedules for Slot #{slot.slot_number}
                                    </h2>
                                    <p className="text-gray-600">
                                        Base Rate: ₱{slot.base_hourly_rate}/hour • {slot.address}
                                    </p>
                                </div>
                                <div className="flex space-x-3">
                                    <Link
                                        href={`/schedules/create?slots=${slot.id}`}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                    >
                                        Add Schedule
                                    </Link>
                                    <Link
                                        href="/schedules"
                                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                                    >
                                        Back to All Schedules
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Schedules List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6 bg-white border-b border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Active Schedules ({schedules.length})
                                        </h3>
                                        {selectedSchedules.length > 0 && (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleBulkAction('activate')}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Activate ({selectedSchedules.length})
                                                </button>
                                                <button
                                                    onClick={() => handleBulkAction('deactivate')}
                                                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Deactivate ({selectedSchedules.length})
                                                </button>
                                                <button
                                                    onClick={() => handleBulkAction('delete')}
                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Delete ({selectedSchedules.length})
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-200">
                                    {schedules.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <p>No schedules created yet.</p>
                                            <Link
                                                href={`/schedules/create?slots=${slot.id}`}
                                                className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
                                            >
                                                Create your first schedule
                                            </Link>
                                        </div>
                                    ) : (
                                        schedules.map((schedule) => (
                                            <div key={schedule.id} className="p-4 hover:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedSchedules.includes(schedule.id)}
                                                            onChange={() => toggleScheduleSelection(schedule.id)}
                                                            className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <h4 className="text-sm font-medium text-gray-900">
                                                                    {schedule.name}
                                                                </h4>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    schedule.schedule_type === 'pricing_tier' ? 'bg-blue-100 text-blue-800' :
                                                                    schedule.schedule_type === 'free_period' ? 'bg-green-100 text-green-800' :
                                                                    schedule.schedule_type === 'restriction_zone' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {schedule.schedule_type.replace('_', ' ')}
                                                                </span>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {schedule.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                {schedule.description}
                                                            </p>
                                                            <div className="flex items-center text-xs text-gray-400 mt-1 space-x-4">
                                                                <span>{formatTimeRange(schedule.time_rules)}</span>
                                                                <span>•</span>
                                                                <span>{formatPricingRules(schedule)}</span>
                                                                <span>•</span>
                                                                <span>Priority: {schedule.priority}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <Link
                                                            href={`/schedules/${schedule.id}/edit`}
                                                            className="text-blue-600 hover:text-blue-900 text-sm"
                                                        >
                                                            Edit
                                                        </Link>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('Are you sure you want to delete this schedule?')) {
                                                                    router.delete(`/schedules/${schedule.id}`);
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-900 text-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Current Rates */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Current Rates</h3>
                                    <div className="space-y-2">
                                        <div className="text-2xl font-bold text-green-600">
                                            {preview.current_rates?.rate_display || `₱${slot.base_hourly_rate}/hr`}
                                        </div>
                                        {preview.current_rates?.is_free_period && (
                                            <div className="text-sm text-green-600">
                                                Free until {preview.current_rates.free_time_remaining?.ends_at}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Upcoming Changes */}
                            {preview.upcoming_changes && preview.upcoming_changes.length > 0 && (
                                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                    <div className="p-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Changes</h3>
                                        <div className="space-y-3">
                                            {preview.upcoming_changes.slice(0, 5).map((change, index) => (
                                                <div key={index} className="border-l-2 border-blue-500 pl-3">
                                                    <div className="text-sm font-medium">
                                                        {change.rate_display}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        In {change.hours_from_now} hours
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quick Templates */}
                            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Templates</h3>
                                    <div className="space-y-3">
                                        {schedule_templates.slice(0, 4).map(template => (
                                            <Link
                                                key={template.id}
                                                href={`/schedules/create?slots=${slot.id}&template=${template.id}`}
                                                className="block p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                                            >
                                                <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}