import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type User } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, Users, Building, Car, MapPin, QrCode, Settings } from 'lucide-react';

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

export default function Dashboard({ user }: DashboardProps) {
    // Fixed: Use user.role directly instead of context
    const renderRoleSpecificContent = () => {
        switch (user.role) {
            case 'vehicle_owner':
                return <VehicleOwnerDashboard user={user} />;
            case 'slot_owner':
                return <SlotOwnerDashboard user={user} />;
            case 'platform_owner':
                return <PlatformOwnerDashboard user={user} />;
            case 'enforcer':
                return <EnforcerDashboard user={user} />;
            default:
                return <BasicDashboard user={user} />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {renderRoleSpecificContent()}
            </div>
        </AppLayout>
    );
}

function BasicDashboard({ user }: { user: User }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                    Welcome back, {user.name}! Your parking platform dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">User Role</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold capitalize">{user.role}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Status</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">Active</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Platform</CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Parking Papi</div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}

function VehicleOwnerDashboard({ user }: { user: User }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        Vehicle Owner Dashboard
                    </CardTitle>
                    <CardDescription>
                        Welcome back, {user.name}! Find and manage your parking sessions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Button className="h-auto p-6 flex-col gap-2">
                            <MapPin className="h-8 w-8" />
                            <span className="text-lg font-semibold">Find Parking</span>
                            <span className="text-sm text-muted-foreground">Search for available spots</span>
                        </Button>
                        <Button variant="outline" className="h-auto p-6 flex-col gap-2">
                            <QrCode className="h-8 w-8" />
                            <span className="text-lg font-semibold">Scan QR Code</span>
                            <span className="text-sm text-muted-foreground">Quick parking activation</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function SlotOwnerDashboard({ user }: { user: User }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Slot Owner Dashboard
                    </CardTitle>
                    <CardDescription>
                        Welcome back, {user.name}! Manage your parking slots and earnings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Link href="/slots">
                            <Button className="h-auto p-6 flex-col gap-2 w-full">
                                <Building className="h-8 w-8" />
                                <span className="text-lg font-semibold">Manage Slots</span>
                                <span className="text-sm text-muted-foreground">Add and configure parking spaces</span>
                            </Button>
                        </Link>
                        <Button variant="outline" className="h-auto p-6 flex-col gap-2" disabled>
                            <AlertTriangle className="h-8 w-8" />
                            <span className="text-lg font-semibold">Analytics</span>
                            <span className="text-sm text-muted-foreground">Coming soon</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function PlatformOwnerDashboard({ user }: { user: User }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Platform Owner Dashboard
                    </CardTitle>
                    <CardDescription>
                        Welcome back, {user.name}! Monitor and manage the entire platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Button className="h-auto p-6 flex-col gap-2">
                            <Users className="h-8 w-8" />
                            <span className="text-lg font-semibold">User Management</span>
                            <span className="text-sm text-muted-foreground">Manage all users</span>
                        </Button>
                        <Button variant="outline" className="h-auto p-6 flex-col gap-2">
                            <Building className="h-8 w-8" />
                            <span className="text-lg font-semibold">Slot Oversight</span>
                            <span className="text-sm text-muted-foreground">Monitor all parking slots</span>
                        </Button>
                        <Button variant="outline" className="h-auto p-6 flex-col gap-2">
                            <AlertTriangle className="h-8 w-8" />
                            <span className="text-lg font-semibold">System Health</span>
                            <span className="text-sm text-muted-foreground">Platform analytics</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function EnforcerDashboard({ user }: { user: User }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Enforcer Dashboard
                    </CardTitle>
                    <CardDescription>
                        Welcome back, {user.name}! Monitor compliance and enforce parking rules.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Button className="h-auto p-6 flex-col gap-2">
                            <QrCode className="h-8 w-8" />
                            <span className="text-lg font-semibold">QR Scanner</span>
                            <span className="text-sm text-muted-foreground">Verify parking sessions</span>
                        </Button>
                        <Button variant="outline" className="h-auto p-6 flex-col gap-2">
                            <Car className="h-8 w-8" />
                            <span className="text-lg font-semibold">Active Sessions</span>
                            <span className="text-sm text-muted-foreground">Monitor current parking</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}