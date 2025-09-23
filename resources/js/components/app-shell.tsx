import { SidebarProvider } from '@/components/ui/sidebar';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    // Use React Suspense to handle potential loading states
    return (
        <SidebarShell>{children}</SidebarShell>
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
