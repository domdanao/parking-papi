// Shared types for the mobile app - matches backend API structure

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
  created_at: string;
  updated_at: string;
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
  parking_slot?: ParkingSlot;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_account' | 'digital_wallet';
  last_four_digits: string;
  is_default: boolean;
}

export interface QRScanResult {
  scan_id: string;
  session_token: string;
  slot_info: {
    id: string;
    slot_number: string;
    hourly_rate: number;
    status: string;
  };
  expires_at: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  ParkingSearch: undefined;
  ParkingDetail: { slotId: string };
  QRScanner: undefined;
  BookingFlow: { scanResult: QRScanResult };
  Profile: undefined;
  ActiveSessions: undefined;
  PaymentMethods: undefined;
  SlotManagement: undefined;
  AddSlot: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Scanner: undefined;
  Sessions: undefined;
  Profile: undefined;
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface ParkingSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  vehicle_type?: string;
  amenities?: string[];
  max_price?: number;
  limit?: number;
}

export interface BookingRequest {
  scan_id: string;
  session_token: string;
  duration_minutes: number;
  payment_method: {
    type: string;
  };
}