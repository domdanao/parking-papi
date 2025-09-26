import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { type BreadcrumbItem, ParkingSlot } from '@/types';
import { ArrowLeft, Calendar, Clock, DollarSign, Settings } from 'lucide-react';

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
    slots: ParkingSlot[];
    selected_slots: string[];
    schedule_templates: ScheduleTemplate[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Schedule Management',
        href: '/schedules',
    },
    {
        title: 'Create Schedule',
        href: '/schedules/create',
    },
];

export default function ScheduleCreate({ slots, selected_slots, schedule_templates }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        slot_ids: selected_slots,
        schedule_type: 'pricing_tier',
        name: '',
        description: '',
        time_rules: {
            days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
            start_time: '08:00:00',
            end_time: '18:00:00',
        },
        pricing_rules: {
            hourly_rate: 75.00,
        },
        recurrence_pattern: {
            type: 'weekly',
        },
        effective_from: new Date().toISOString().split('T')[0],
        effective_until: '',
        is_active: true,
        priority: 0,
    });

    const scheduleTypeOptions = [
        { value: 'pricing_tier', label: 'Pricing Tier', description: 'Set different rates for specific times', color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { value: 'free_period', label: 'Free Period', description: 'Make parking free during certain hours', color: 'bg-green-100 text-green-800 border-green-200' },
        { value: 'restriction_zone', label: 'Restriction Zone', description: 'Prohibit parking during certain hours', color: 'bg-red-100 text-red-800 border-red-200' },
    ];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/schedules');
    };

    const applyTemplate = (template: ScheduleTemplate) => {
        setData(prevData => ({
            ...prevData,
            schedule_type: template.schedule_type,
            name: template.name,
            description: template.description,
            time_rules: template.time_rules,
            pricing_rules: template.pricing_rules,
            recurrence_pattern: template.recurrence_pattern,
        }));
    };

    const toggleDayOfWeek = (dayIndex: number) => {
        setData('time_rules', {
            ...data.time_rules,
            days_of_week: data.time_rules.days_of_week.includes(dayIndex)
                ? data.time_rules.days_of_week.filter((d: number) => d !== dayIndex)
                : [...data.time_rules.days_of_week, dayIndex]
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Schedule" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 bg-gray-50 dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Create Schedule</h1>
                        <p className="text-gray-600 dark:text-slate-300">Set up dynamic pricing schedules for your parking slots</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Settings className="h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Schedule Name</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            placeholder="e.g., Business Hours Premium"
                                            className="mt-1"
                                        />
                                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder="Describe when and how this schedule applies"
                                            className="mt-1"
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <Label>Schedule Type</Label>
                                        <div className="mt-2 space-y-3">
                                            {scheduleTypeOptions.map(option => (
                                                <div key={option.value} className="flex items-start">
                                                    <div className="flex items-center h-5">
                                                        <input
                                                            type="radio"
                                                            name="schedule_type"
                                                            value={option.value}
                                                            checked={data.schedule_type === option.value}
                                                            onChange={e => setData('schedule_type', e.target.value)}
                                                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                                        />
                                                    </div>
                                                    <div className="ml-3 text-sm">
                                                        <label className="font-medium text-gray-900 dark:text-slate-100">
                                                            {option.label}
                                                        </label>
                                                        <p className="text-gray-600 dark:text-slate-300">{option.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Time Settings */}
                            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="h-5 w-5" />
                                        Time Settings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label>Days of Week</Label>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {dayNames.map((day, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => toggleDayOfWeek(index)}
                                                    className={`px-3 py-1 text-sm rounded-md border ${
                                                        data.time_rules.days_of_week.includes(index)
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {day.slice(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="start_time">Start Time</Label>
                                            <Input
                                                id="start_time"
                                                type="time"
                                                value={data.time_rules.start_time}
                                                onChange={e => setData('time_rules', {
                                                    ...data.time_rules,
                                                    start_time: e.target.value
                                                })}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="end_time">End Time</Label>
                                            <Input
                                                id="end_time"
                                                type="time"
                                                value={data.time_rules.end_time}
                                                onChange={e => setData('time_rules', {
                                                    ...data.time_rules,
                                                    end_time: e.target.value
                                                })}
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pricing Rules */}
                            {data.schedule_type === 'pricing_tier' && (
                                <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <DollarSign className="h-5 w-5" />
                                            Pricing Rules
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div>
                                            <Label htmlFor="hourly_rate">Hourly Rate (₱)</Label>
                                            <Input
                                                id="hourly_rate"
                                                type="number"
                                                step="0.01"
                                                value={data.pricing_rules.hourly_rate}
                                                onChange={e => setData('pricing_rules', {
                                                    ...data.pricing_rules,
                                                    hourly_rate: parseFloat(e.target.value) || 0
                                                })}
                                                className="mt-1"
                                                min="0"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    {processing ? 'Creating...' : 'Create Schedule'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Templates */}
                        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Templates</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {schedule_templates.map(template => (
                                    <div
                                        key={template.id}
                                        className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                        onClick={() => applyTemplate(template)}
                                    >
                                        <h4 className="font-medium text-gray-900 dark:text-slate-100">{template.name}</h4>
                                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{template.description}</p>
                                        <Badge className="mt-2 text-xs" variant="secondary">
                                            {template.schedule_type.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Selected Slots */}
                        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Selected Slots ({data.slot_ids.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {slots
                                        .filter(slot => data.slot_ids.includes(slot.id))
                                        .map(slot => (
                                            <div key={slot.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded">
                                                <span className="text-sm font-medium">Slot #{slot.slot_number}</span>
                                                <span className="text-sm text-gray-600 dark:text-slate-300">₱{slot.base_hourly_rate}/hr</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}