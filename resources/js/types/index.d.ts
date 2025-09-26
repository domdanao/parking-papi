import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: string;
    name: string;
    email: string;
    mobile_number?: string;
    first_name?: string;
    last_name?: string;
    role: 'vehicle_owner' | 'slot_owner' | 'platform_owner' | 'enforcer';
    account_type: 'registered' | 'guest';
    avatar?: string;
    email_verified_at: string | null;
    mobile_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface ParkingSlot {
    id: string;
    slot_number: string;
    latitude: number;
    longitude: number;
    address: string;
    base_hourly_rate: number;
    status: 'available' | 'occupied' | 'reserved' | 'maintenance';
    approval_status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'published';
    is_active: boolean;
    amenities?: string[];
    vehicle_compatibility?: string[];
    photos?: string[];
    distance_meters?: number;
    estimated_walk_time_minutes?: number;
    owner?: Pick<User, 'id' | 'first_name' | 'last_name'>;
    parking_schedules_count?: number;
    created_at: string;
    updated_at: string;
}

export interface ParkingSession {
    id: string;
    user_id: string;
    parking_slot_id: string;
    start_time: string;
    end_time: string;
    actual_end_time?: string;
    duration_minutes: number;
    hourly_rate: number;
    total_amount: number;
    payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    payment_method: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled' | 'expired';
    confirmation_code: string;
    created_at: string;
    updated_at: string;
}

export interface ParkingSchedule {
    id: string;
    parking_slot_id: string;
    schedule_type: 'availability_window' | 'pricing_tier' | 'free_period' | 'restriction_zone';
    name: string;
    description?: string;
    time_rules: any; // JSON field with flexible structure
    pricing_rules: any; // JSON field with flexible structure
    recurrence_pattern: any; // JSON field for recurring schedules
    effective_from: string;
    effective_until?: string;
    is_active: boolean;
    priority: number;
    created_at: string;
    updated_at: string;
}

export interface PaymentMethod {
    id: string;
    type: 'credit_card' | 'bank_account' | 'digital_wallet';
    last_four_digits: string;
    is_default: boolean;
}

export interface SlotPerformanceMetric {
    slot_id: string;
    total_revenue: number;
    occupancy_rate: number;
    total_sessions: number;
    average_session_duration: number;
}

export interface PlatformHealthKPIs {
    total_active_sessions: number;
    total_revenue_today: number;
    active_parking_slots: number;
    registered_users: number;
}

export interface PlatformAlert {
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
}
