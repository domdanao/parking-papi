# Dynamic Parking Hours & Time-Based Pricing Implementation Plan

## Overview
Implement comprehensive time-based pricing and availability system that accommodates government regulations, rush hour restrictions, weekend free parking, and dynamic use cases. The system maintains permanent physical QR codes while enabling real-time pricing intelligence.

## Architectural Foundation

### QR Code Strategy: Permanent & Simple ✅
- **Remove signature expiry system** - eliminate daily signature rotation causing log noise
- **Simplified QR payload**: `{type, slot_id, version}` only
- **Permanent QR codes** - once printed, work forever regardless of pricing changes
- **Server-side security** - UUID validation, rate limiting, location verification, audit logging

## Core Components to Build

### 1. **Operating Schedule System**
- **ParkingSchedule Model**: Define operating hours, pricing rules, restrictions
- **Schedule Types**:
  - `availability_window` - when parking is allowed/prohibited
  - `pricing_tier` - different rates by time periods
  - `free_period` - weekend/holiday free parking
  - `restriction_zone` - rush hour no-parking enforcement
- **Recurrence Engine**: Weekly patterns, seasonal schedules, holiday exceptions

### 2. **Dynamic Pricing Calculator Service**
- **Real-time Rate Engine**: Calculates current rate for any slot at any time
- **Transition Logic**: Handles rate changes during active parking sessions
- **Rate Preview**: Shows upcoming rate changes for driver planning
- **Government API Integration**: Pulls municipal parking regulations
- **Performance Optimization**: Redis caching for high-frequency rate lookups

### 3. **Enhanced QR Scan Response**
Current static response becomes dynamic:
```php
// Before: Static slot info + base rate
// After: Current rate + upcoming changes + restrictions
return [
    'slot' => $slot,
    'currentRate' => '₱75/hour until 7PM',
    'upcomingRates' => ['7PM: ₱50/hour', '10PM: FREE'],
    'restrictions' => ['No parking 7-9AM weekdays'],
    'freeTimeRemaining' => null // or countdown if in free period
];
```

### 4. **Session Transition Management**
- **Mid-Session Rate Changes**: Automatically adjust billing when rates change
- **Payment Transitions**: Handle paid→free, free→paid, rate increases/decreases
- **Refund Engine**: Auto-refunds when paid periods become free
- **Split Billing**: Different rates for different time segments within one session
- **Notification System**: 15-minute warnings before rate changes

### 5. **Slot Owner Schedule Configuration**
- **Visual Schedule Builder**: Weekly calendar interface for setting hours/rates
- **Government Templates**: Pre-configured patterns for city parking rules
- **Bulk Operations**: Apply schedules to multiple slots by zone/area
- **Schedule Preview**: Test mode to see how schedules affect real QR scans
- **Override System**: Temporary rate changes for events/emergencies

## Technical Implementation

### Database Schema Extensions
```sql
-- New table for flexible schedule rules
parking_schedules (
    id, parking_slot_id,
    schedule_type, recurrence_pattern,
    time_rules (JSON), pricing_rules (JSON),
    effective_from, effective_until,
    is_active, priority
);

-- Enhanced sessions for rate transitions
ALTER TABLE parking_sessions ADD COLUMNS (
    rate_transitions JSON,
    original_rate DECIMAL(10,2),
    final_calculated_amount DECIMAL(10,2)
);
```

### Laravel Services
- **ParkingScheduleService**: Core schedule evaluation logic
- **RateCalculatorService**: Real-time pricing determination
- **SessionTransitionService**: Manages rate changes during active sessions
- **ScheduleValidationService**: Prevents conflicting schedule rules

### QR Service Simplification
```php
// Remove signature complexity
private function generateQRData(ParkingSlot $slot): string {
    $qrPayload = [
        'type' => 'parking_slot',
        'slot_id' => $slot->id,
        'version' => '1.0'
    ];
    $encodedData = base64_encode(json_encode($qrPayload));
    return config('app.url') . '/parking/scan/' . $encodedData;
}

// Enhanced scan processing with dynamic pricing
public function processScan(string $encodedData, ?string $userId, ?array $location): array {
    $slot = $this->validateAndGetSlot($encodedData);
    $currentPricing = $this->rateCalculator->getCurrentRates($slot, now());
    $upcomingChanges = $this->rateCalculator->getUpcomingChanges($slot, now());
    // Return dynamic pricing context
}
```

### Frontend Enhancements
- **Dynamic QR Scan Results**: Show time-sensitive pricing information
- **Schedule Management UI**: Visual schedule builder for slot owners
- **Real-time Rate Updates**: WebSocket integration for live pricing changes
- **Mobile Optimization**: Compact schedule displays for mobile QR scanning

## Key Use Cases Supported

1. **City Government**: "Paid 8AM-6PM weekdays, free weekends/holidays"
2. **Rush Hour Restrictions**: "No parking 7-9AM, 5-7PM on Ayala Avenue"
3. **Event Pricing**: "₱100/hour during concert nights, ₱50 normal"
4. **Demand-Based**: "₱25 off-peak, ₱50 business hours, ₱75 peak"
5. **Seasonal Rules**: "Free December parking, paid January-November"

## Implementation Phases

**Phase 1: Foundation (Week 1)**
- Remove QR signature system, simplify QR generation
- Create ParkingSchedule model and basic schedule evaluation
- Build RateCalculatorService with time-based logic

**Phase 2: Dynamic QR Response (Week 1)**
- Enhance QR scan controller with dynamic pricing
- Add real-time rate calculation to scan results
- Implement upcoming rate change preview

**Phase 3: Session Management (Week 2)**
- Build SessionTransitionService for mid-session rate changes
- Add payment transition logic and refund automation
- Implement rate change notifications

**Phase 4: Admin Interface (Week 2)**
- Create schedule management UI for slot owners
- Add bulk schedule operations for multiple slots
- Build schedule preview and testing tools

**Phase 5: Advanced Features (Week 3)**
- Government API integration hooks
- Performance optimization and caching
- Comprehensive testing and validation

## Benefits

- **Zero Physical Changes**: Existing QR codes continue working forever
- **Instant Rate Updates**: Changes apply immediately to all slots
- **Government Compliance**: Easy integration with municipal parking rules
- **Driver Transparency**: Real-time rate information prevents surprises
- **Revenue Optimization**: Dynamic pricing based on demand and regulations
- **Reduced Maintenance**: No daily signature expiration log noise

This approach eliminates QR signature complexity while enabling sophisticated time-based pricing - perfect for permanent physical QR codes with dynamic server-side intelligence.