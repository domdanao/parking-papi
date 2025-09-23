import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type User } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Car, MapPin, DollarSign, Clock, AlertTriangle, Users, Building } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

interface DashboardProps {
    user: User;
    dashboardData: any;
}

export default function Dashboard({ user, dashboardData }: DashboardProps) {
    const renderDashboard = () => {
        switch (dashboardData.type) {
            case 'vehicle_owner':
                return <VehicleOwnerDashboard data={dashboardData} />;
            case 'slot_owner':
                return <SlotOwnerDashboard data={dashboardData} />;
            case 'platform_owner':
                return <PlatformOwnerDashboard data={dashboardData} />;
            case 'enforcer':
                return <EnforcerDashboard data={dashboardData} />;
            default:
                return <div>Welcome to the Parking Platform</div>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Welcome back, {user.first_name || user.name}!</h1>
                        <p className="text-muted-foreground">Role: {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    </div>
                </div>
                {renderDashboard()}
            </div>
        </AppLayout>
    );
}

function VehicleOwnerDashboard({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.active_sessions}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Spent This Month</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.stats.total_spent_this_month}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sessions This Month</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.sessions_this_month}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Favorite Locations</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.favorite_locations}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Find Parking</CardTitle>
                        <CardDescription>Search for available parking spots near you</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/parking/search">
                            <Button className="w-full">
                                <MapPin className="mr-2 h-4 w-4" />
                                Find Nearby Parking
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Active Sessions</CardTitle>
                        <CardDescription>Your current parking sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.active_sessions.length > 0 ? (
                            <div className="space-y-2">
                                {data.active_sessions.map((session: any) => (
                                    <div key={session.id} className="flex items-center justify-between p-2 border rounded">
                                        <div>
                                            <p className="font-medium">{session.parking_slot?.address}</p>
                                            <p className="text-sm text-muted-foreground">Code: {session.confirmation_code}</p>
                                        </div>
                                        <Badge variant="outline">Active</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No active parking sessions</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SlotOwnerDashboard({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.total_slots}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Slots</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.active_slots}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.stats.revenue_this_month}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(data.stats.occupancy_rate * 100)}%</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Slots</CardTitle>
                        <CardDescription>Add new parking slots or update existing ones</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/slots/create">
                            <Button className="w-full">
                                <Building className="mr-2 h-4 w-4" />
                                Add New Slot
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Performance Analytics</CardTitle>
                        <CardDescription>View detailed analytics for your slots</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/slots">
                            <Button variant="outline" className="w-full">
                                View My Slots
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function PlatformOwnerDashboard({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.total_slots}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.active_sessions}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.stats.daily_revenue}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.total_users}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Platform Alerts</CardTitle>
                    <CardDescription>Important notifications and system status</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.alerts.map((alert: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded mb-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span>{alert.message}</span>
                            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                                {alert.severity}
                            </Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function EnforcerDashboard({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Violations Today</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.violations_today}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sessions to Check</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.active_sessions_to_check}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired Sessions</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.expired_sessions}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Enforcement Tools</CardTitle>
                    <CardDescription>Tools for monitoring and enforcement</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Button className="w-full">
                            <Car className="mr-2 h-4 w-4" />
                            QR Code Scanner
                        </Button>
                        <Button variant="outline" className="w-full">
                            View All Active Sessions
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
