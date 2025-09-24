import { SidebarProvider } from '@/components/ui/sidebar';
import { SimpleParkingProvider } from '@/providers/simple-parking-provider';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

// Force cache break - changed function signature
export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const page = usePage<SharedData>();
    const userRole = page?.props?.auth?.user?.role;

    if (variant === 'header') {
        return (
            <SimpleParkingProvider userRole={userRole}>
                <div className="flex min-h-screen w-full flex-col">{children}</div>
            </SimpleParkingProvider>
        );
    }

    // Use React Suspense to handle potential loading states
    return (
        <SimpleParkingProvider userRole={userRole}>
            <SidebarShell>{children}</SidebarShell>
        </SimpleParkingProvider>
    );
}

function SidebarShell({ children }: { children: React.ReactNode }) {
    try {
        const page = usePage<SharedData>();
        const isOpen = page?.props?.sidebarOpen ?? true;

        return <SidebarProvider defaultOpen={isOpen}>{children}</SidebarProvider>;
    } catch (error) {
        console.error('Error accessing Inertia page context:', error);
        // Fallback to default sidebar state
        return <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>;
    }
}
