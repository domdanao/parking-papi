# Data Model: Street Parking Platform

**Generated**: 2025-09-22 | **For Feature**: Street Parking Platform

## Overview

This document defines the data model for a three-sided marketplace parking platform, extracted from functional requirements FR-001 through FR-141+ in the feature specification.

---

## Core Entities

### 1. User (Multi-Role Entity)

**Base User Model**:
```typescript
interface User {
  id: UUID;
  email: string;
  email_verified_at?: DateTime;
  mobile_number: string;
  mobile_verified_at?: DateTime;
  first_name?: string;
  last_name?: string;
  driver_license?: string;
  role: UserRole;
  account_type: 'temporary' | 'registered';
  created_at: DateTime;
  updated_at: DateTime;
  version: number; // For optimistic locking
}

enum UserRole {
  VEHICLE_OWNER = 'vehicle_owner',
  SLOT_OWNER = 'slot_owner',
  PLATFORM_OWNER = 'platform_owner',
  ENFORCER = 'enforcer'
}
```

**Vehicle Owner Extensions**:
```typescript
interface VehicleOwnerProfile {
  user_id: UUID;
  payment_methods: PaymentMethod[];
  vehicles: Vehicle[];
  wallet: DigitalWallet;
  loyalty_points: number;
  loyalty_tier: LoyaltyTier;
  preferences: VehicleOwnerPreferences;
}

interface VehicleOwnerPreferences {
  notification_settings: NotificationSettings;
  default_search_radius: number;
  preferred_amenities: string[];
  auto_extend_parking: boolean;
}
```

**Slot Owner Extensions**:
```typescript
interface SlotOwnerProfile {
  user_id: UUID;
  verification_status: VerificationStatus;
  business_type: 'individual' | 'corporate';
  business_registration?: string;
  banking_details: BankingDetails;
  commission_tier: CommissionTier;
  performance_metrics: SlotOwnerMetrics;
}

enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
}
```

### 2. ParkingSlot

```typescript
interface ParkingSlot {
  id: UUID;
  slot_owner_id: UUID;
  slot_number: string;

  // Location data
  latitude: number;
  longitude: number;
  address: string;
  landmark_references?: string;

  // Physical description
  dimensions: SlotDimensions;
  surface_type: SurfaceType;
  accessibility_features: string[];
  vehicle_compatibility: VehicleType[];

  // Pricing structure
  base_hourly_rate: number;
  pricing_variations: PricingVariation[];
  minimum_duration_minutes: number;
  maximum_duration_minutes: number;

  // Status and availability
  status: SlotStatus;
  approval_status: ApprovalStatus;
  is_active: boolean;

  // Features and restrictions
  amenities: string[]; // ['covered', 'secured', 'ev_charging']
  restrictions: string[];
  special_conditions?: string;

  // Metadata
  qr_code_hash?: string;
  photos: string[];
  created_at: DateTime;
  updated_at: DateTime;
  version: number;
}

enum SlotStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance'
}

enum ApprovalStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published'
}

interface SlotDimensions {
  length_meters: number;
  width_meters: number;
  height_clearance_meters?: number;
}

interface PricingVariation {
  id: UUID;
  day_of_week?: number; // 0-6 (Sunday-Saturday)
  start_time?: string; // 'HH:MM'
  end_time?: string; // 'HH:MM'
  rate_multiplier: number; // 1.0 = base rate, 1.5 = 50% increase
  is_active: boolean;
}
```

### 3. ParkingSession

```typescript
interface ParkingSession {
  id: UUID;
  user_id: UUID;
  parking_slot_id: UUID;

  // Session timing
  start_time: DateTime;
  end_time: DateTime;
  actual_end_time?: DateTime;
  duration_minutes: number;

  // Payment and pricing
  hourly_rate: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethodType;

  // Session status
  status: SessionStatus;
  confirmation_code: string;

  // Extensions and modifications
  extensions: SessionExtension[];

  // Metadata
  created_at: DateTime;
  updated_at: DateTime;
}

enum SessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

interface SessionExtension {
  id: UUID;
  session_id: UUID;
  additional_minutes: number;
  additional_amount: number;
  extended_at: DateTime;
  payment_transaction_id: UUID;
}
```

### 4. Payment and Wallet System

```typescript
interface PaymentTransaction {
  id: UUID;
  user_id: UUID;
  session_id?: UUID;

  // Transaction details
  amount: number;
  currency: string;
  transaction_type: TransactionType;
  payment_method: PaymentMethodType;

  // Processing information
  status: PaymentStatus;
  gateway_transaction_id?: string;
  gateway_response?: object;

  // Commission and fees
  platform_commission: number;
  payment_processing_fee: number;
  net_amount_to_slot_owner: number;

  // Metadata
  description?: string;
  created_at: DateTime;
  processed_at?: DateTime;
}

enum TransactionType {
  PARKING_PAYMENT = 'parking_payment',
  WALLET_TOPUP = 'wallet_topup',
  REFUND = 'refund',
  COMMISSION = 'commission',
  LOYALTY_REDEMPTION = 'loyalty_redemption'
}

enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

interface DigitalWallet {
  id: UUID;
  user_id: UUID;
  balance: number;
  currency: string;

  // Auto top-up settings
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  auto_topup_amount: number;
  default_payment_method_id?: UUID;

  // Security
  daily_limit: number;
  transaction_limit_per_session: number;

  created_at: DateTime;
  updated_at: DateTime;
}

interface PaymentMethod {
  id: UUID;
  user_id: UUID;
  type: PaymentMethodType;

  // Card details (tokenized)
  last_four_digits?: string;
  card_brand?: string;
  expiry_month?: number;
  expiry_year?: number;

  // Gateway information
  gateway_token: string;
  gateway_customer_id: string;

  is_default: boolean;
  is_active: boolean;
  created_at: DateTime;
}

enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet'
}
```

### 5. Loyalty Program

```typescript
interface LoyaltyProgram {
  id: UUID;
  user_id: UUID;

  // Points and tier
  total_points_earned: number;
  available_points: number;
  current_tier: LoyaltyTier;
  tier_progress: number; // Percentage to next tier

  // Statistics
  total_sessions: number;
  total_spent: number;
  tier_benefits: TierBenefit[];

  // Metadata
  joined_at: DateTime;
  tier_achieved_at: DateTime;
}

enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

interface LoyaltyTransaction {
  id: UUID;
  user_id: UUID;
  session_id?: UUID;

  points_change: number; // Positive for earning, negative for redemption
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  description: string;

  created_at: DateTime;
}
```

### 6. QR Code Management

```typescript
interface QRCode {
  id: UUID;
  parking_slot_id: UUID;

  // QR code data
  qr_code_hash: string;
  qr_data: string; // Encrypted payload

  // Security and expiry
  generated_at: DateTime;
  expires_at?: DateTime;
  scan_count: number;
  max_scans?: number;

  // Status
  is_active: boolean;
  deactivated_at?: DateTime;
  deactivation_reason?: string;
}

interface QRScanLog {
  id: UUID;
  qr_code_id: UUID;
  user_id?: UUID;

  // Scan details
  scanned_at: DateTime;
  ip_address: string;
  user_agent: string;
  location?: {
    latitude: number;
    longitude: number;
  };

  // Result
  scan_result: ScanResult;
  session_id?: UUID; // If scan resulted in booking
}

enum ScanResult {
  SUCCESS = 'success',
  EXPIRED = 'expired',
  INVALID = 'invalid',
  SLOT_UNAVAILABLE = 'slot_unavailable',
  USER_ERROR = 'user_error'
}
```

### 7. Enforcement System

```typescript
interface EnforcementAction {
  id: UUID;
  parking_slot_id: UUID;
  enforcer_id: UUID;

  // Violation details
  violation_type: ViolationType;
  description: string;
  evidence_photos: string[];

  // Vehicle information
  license_plate?: string;
  vehicle_description?: string;

  // Action taken
  action_taken: EnforcementActionType;
  penalty_amount?: number;

  // Status tracking
  status: EnforcementStatus;
  resolved_at?: DateTime;
  payment_received_at?: DateTime;

  created_at: DateTime;
  updated_at: DateTime;
}

enum ViolationType {
  NO_PAYMENT = 'no_payment',
  EXPIRED_SESSION = 'expired_session',
  INVALID_VEHICLE_TYPE = 'invalid_vehicle_type',
  BLOCKING_ACCESS = 'blocking_access',
  DAMAGED_QR_CODE = 'damaged_qr_code'
}

enum EnforcementActionType {
  WARNING = 'warning',
  PENALTY_NOTICE = 'penalty_notice',
  CLAMPING = 'clamping',
  TOWING = 'towing'
}

enum EnforcementStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  DISPUTED = 'disputed'
}
```

### 8. Analytics and Reporting

```typescript
interface SlotPerformanceMetrics {
  id: UUID;
  parking_slot_id: UUID;

  // Time period
  period_start: DateTime;
  period_end: DateTime;
  period_type: 'hourly' | 'daily' | 'weekly' | 'monthly';

  // Usage metrics
  total_sessions: number;
  total_duration_minutes: number;
  occupancy_rate: number; // Percentage
  average_session_duration: number;

  // Revenue metrics
  total_revenue: number;
  average_revenue_per_session: number;
  peak_hour_revenue: number;

  // Demand metrics
  demand_score: number; // Calculated metric
  price_efficiency: number;

  created_at: DateTime;
}

interface UserBehaviorAnalytics {
  id: UUID;
  user_id: UUID;

  // Behavior patterns
  preferred_booking_times: object;
  average_session_duration: number;
  favorite_locations: object;
  price_sensitivity_score: number;

  // Engagement metrics
  app_usage_frequency: number;
  last_session_date: DateTime;
  churn_risk_score: number;

  // Spending patterns
  total_lifetime_value: number;
  average_monthly_spend: number;

  calculated_at: DateTime;
}
```

### 9. Notifications and Communications

```typescript
interface NotificationTemplate {
  id: UUID;
  name: string;
  type: NotificationType;

  // Template content
  title_template: string;
  body_template: string;
  email_template?: string;

  // Delivery settings
  delivery_channels: NotificationChannel[];
  is_active: boolean;

  created_at: DateTime;
  updated_at: DateTime;
}

interface NotificationLog {
  id: UUID;
  user_id: UUID;
  template_id: UUID;

  // Content
  title: string;
  body: string;
  data?: object;

  // Delivery
  channel: NotificationChannel;
  status: NotificationStatus;
  sent_at?: DateTime;
  delivered_at?: DateTime;
  read_at?: DateTime;

  // Context
  session_id?: UUID;
  slot_id?: UUID;
}

enum NotificationType {
  PARKING_EXPIRY = 'parking_expiry',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  BOOKING_REMINDER = 'booking_reminder',
  PROMOTION = 'promotion',
  SYSTEM_ALERT = 'system_alert'
}

enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app'
}

enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed'
}
```

---

## Relationships

### Primary Relationships
- **User → ParkingSlot**: One-to-many (slot owner)
- **User → ParkingSession**: One-to-many (vehicle owner)
- **ParkingSlot → ParkingSession**: One-to-many
- **ParkingSlot → QRCode**: One-to-one (active)
- **User → DigitalWallet**: One-to-one
- **User → LoyaltyProgram**: One-to-one
- **ParkingSession → PaymentTransaction**: One-to-many

### Validation Rules

#### User Validation
- Email must be unique and valid format
- Mobile number must be unique and verified via OTP
- Driver's license required for registered users
- Role assignments must be valid enum values

#### ParkingSlot Validation
- Latitude: -90 to 90, Longitude: -180 to 180
- Hourly rate must be positive
- Minimum duration ≤ Maximum duration
- Photos required for slot registration

#### ParkingSession Validation
- End time must be after start time
- Duration must match time difference
- Payment amount must equal (hourly rate × duration)
- Confirmation code must be unique

#### Payment Validation
- Amount must be positive
- Currency must be supported (PHP, USD, EUR, etc.)
- Commission percentage must be between 0-100%
- Payment method must be verified

---

## State Transitions

### ParkingSlot Status Flow
```
draft → submitted → under_review → approved → published
                                 ↓
                               rejected
```

### ParkingSession Status Flow
```
pending → active → completed
       ↓       ↓
   cancelled expired
```

### Payment Status Flow
```
pending → processing → completed
                   ↓
                failed → refunded
```

---

## Indexing Strategy

### PostgreSQL Indexes
```sql
-- Geospatial indexes (PostGIS)
CREATE INDEX idx_parking_slots_location ON parking_slots USING GIST (ST_Point(longitude, latitude));

-- Performance indexes
CREATE INDEX idx_parking_sessions_user_status ON parking_sessions (user_id, status);
CREATE INDEX idx_parking_sessions_slot_time ON parking_sessions (parking_slot_id, start_time);
CREATE INDEX idx_payment_transactions_user_status ON payment_transactions (user_id, status);
CREATE INDEX idx_qr_codes_active ON qr_codes (parking_slot_id) WHERE is_active = true;

-- Analytics indexes
CREATE INDEX idx_slot_metrics_period ON slot_performance_metrics (parking_slot_id, period_start, period_end);
CREATE INDEX idx_notification_logs_user_sent ON notification_logs (user_id, sent_at);
```

---

## Data Retention and Archival

### Retention Policies
- **ParkingSession**: 7 years (financial records)
- **PaymentTransaction**: 7 years (financial records)
- **QRScanLog**: 1 year (security analysis)
- **NotificationLog**: 6 months (debugging)
- **EnforcementAction**: 5 years (legal requirements)

### Archival Strategy
- Move historical data to separate archive tables
- Maintain active indexes on current data only
- Implement automated archival jobs

---

*This data model supports all functional requirements FR-001 through FR-141+ and aligns with constitutional principles of clarity, security, and future-ready evolution.*