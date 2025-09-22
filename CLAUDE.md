# Claude Code Context: Parking Platform

**Feature**: Street Parking Platform | **Branch**: 001-this-is-a | **Updated**: 2025-09-22

## Project Overview

A three-sided marketplace parking platform connecting vehicle owners, parking slot owners, and platform operators. Built with Laravel + Inertia.js + React for web, Expo React Native for mobile, with real-time QR code-based parking, payment processing, and AI-powered analytics.

## Tech Stack

**Backend**: Laravel 11.x, PHP 8.3, PostgreSQL, Redis, Laravel Reverb (WebSockets)
**Frontend**: Inertia.js, React 18, TypeScript 5.x, Zustand (state), Tailwind CSS
**Mobile**: Expo React Native, expo-camera (QR scanning), expo-sqlite (offline storage)
**Payments**: Magpie Payment Gateway (via MCP server)
**Testing**: PHPUnit (backend), Jest/RTL (frontend), Playwright (E2E)
**Deployment**: Laravel Cloud (multi-region), EAS Build (mobile)
**Auth**: Laravel Sanctum (API tokens), Laravel Fortify (web auth)

## Architecture Decisions

- **Modern Monolith**: Inertia.js eliminates API boilerplate while providing SPA experience
- **Real-time**: Laravel Reverb for WebSocket updates (slot availability, notifications)
- **Geospatial**: PostGIS for efficient parking slot proximity queries
- **Concurrency**: PostgreSQL advisory locks + optimistic locking for QR code scanning
- **Offline**: PWA with service workers, IndexedDB for complex data storage
- **Multi-platform**: Shared React components between web and mobile via Inertia/Expo

## Key Entities

**User Roles**: vehicle_owner, slot_owner, platform_owner, enforcer
**Core Models**: ParkingSlot, ParkingSession, PaymentTransaction, QRCode, DigitalWallet
**Analytics**: SlotPerformanceMetrics, UserBehaviorAnalytics, RevenueForecasting

## Critical Features

### QR Code Flow
1. Slot owner registers → Platform approves → QR code generated
2. Vehicle owner scans QR → Gets slot info + session token (5min expiry)
3. Payment processing → Active parking session with confirmation code
4. Real-time updates broadcast slot status changes

### Payment System
- **Digital Wallet**: Auto top-up, loyalty points, transaction history
- **Multiple Methods**: Credit/debit cards, bank transfers via Magpie gateway
- **Commission Model**: Platform takes percentage, remainder to slot owner
- **Refunds**: Automated for early departure, cancellations

### Real-time Features
- **WebSocket Channels**: `parking-area-{id}` for slot updates, `user.{id}` for notifications
- **Push Notifications**: Parking expiration alerts (15min, 5min warnings)
- **Live Analytics**: Occupancy rates, revenue tracking, performance metrics

## Database Schema Highlights

```sql
-- Geospatial parking slots with PostGIS
CREATE TABLE parking_slots (
    id UUID PRIMARY KEY,
    location GEOGRAPHY(POINT, 4326),
    status ENUM('available', 'occupied', 'reserved', 'maintenance'),
    approval_status ENUM('draft', 'submitted', 'under_review', 'approved', 'published'),
    base_hourly_rate DECIMAL(10,2),
    version INTEGER DEFAULT 1 -- Optimistic locking
);

-- Concurrent session management
CREATE TABLE parking_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    parking_slot_id UUID REFERENCES parking_slots(id),
    status ENUM('pending', 'active', 'completed', 'cancelled', 'expired'),
    confirmation_code VARCHAR(20) UNIQUE
);

-- Payment transactions with commission tracking
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES parking_sessions(id),
    amount DECIMAL(10,2),
    platform_commission DECIMAL(10,2),
    net_amount_to_slot_owner DECIMAL(10,2),
    status ENUM('pending', 'processing', 'completed', 'failed', 'refunded')
);
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration with OTP verification
- `POST /auth/login` - Sanctum token authentication
- `POST /auth/verify-otp` - Mobile number verification

### Parking Operations
- `GET /parking-slots/nearby` - Find slots by location + filters
- `POST /qr/scan` - Process QR code scan with location validation
- `POST /qr/activate-payment` - Complete booking with payment
- `PUT /parking-sessions/{id}/extend` - Extend active sessions

### Analytics (Role-based access)
- `GET /analytics/slot-performance` - Revenue, occupancy, recommendations
- `GET /analytics/revenue` - Financial breakdown + forecasting
- `GET /analytics/platform-health` - System KPIs (platform owners only)

## Development Patterns

### State Management (Frontend)
```javascript
// Zustand for global state
const useParkingStore = create((set) => ({
  availableSlots: [],
  currentSession: null,
  updateSlotStatus: (slotId, status) => set(state => ({
    availableSlots: state.availableSlots.map(slot =>
      slot.id === slotId ? { ...slot, status } : slot
    )
  }))
}));

// Real-time updates via Laravel Echo
Echo.channel('parking-area-1')
  .listen('SlotStatusChanged', (e) => {
    useParkingStore.getState().updateSlotStatus(e.slot_id, e.status);
  });
```

### Concurrency Control (Backend)
```php
// PostgreSQL advisory locks for QR scanning
DB::transaction(function () use ($slotId, $userId) {
    DB::select('SELECT pg_advisory_xact_lock(?)', [crc32($slotId)]);

    $slot = ParkingSlot::where('id', $slotId)
        ->where('status', 'available')
        ->lockForUpdate()
        ->firstOrFail();

    $attempt = $slot->attemptBooking($userId);
    broadcast(new SlotStatusChanged($slot, 'reserved'));

    return $attempt;
});
```

### Mobile Integration (Expo)
```javascript
// QR scanning with expo-camera
import { CameraView } from 'expo-camera';

const handleQRScan = async ({ data }) => {
  const location = await Location.getCurrentPositionAsync();

  const response = await api.post('/qr/scan', {
    qr_data: data,
    location: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    }
  });

  // Navigate to payment screen with session token
};
```

## File Structure

```
backend/
├── app/Models/ (User, ParkingSlot, ParkingSession, PaymentTransaction)
├── app/Http/Controllers/ (Auth, ParkingSlots, QRScanning, Payments)
├── app/Services/ (PaymentService, QRCodeService, AnalyticsService)
├── app/Events/ (SlotStatusChanged, ParkingExpirationWarning)
├── database/migrations/ (PostgreSQL schema with PostGIS)
└── tests/ (PHPUnit contract + integration tests)

frontend/resources/js/
├── Pages/ (Dashboard, SlotManagement, Analytics - role-based)
├── Components/Common/ (Button, Modal, QRScanner)
├── Components/VehicleOwner/ (SlotSearch, PaymentForm)
├── Components/SlotOwner/ (SlotRegistration, PerformanceDashboard)
├── Services/ (api.js, websocket.js, offline-storage.js)
└── Stores/ (parkingStore.js, authStore.js)

mobile/expo-app/
├── src/screens/ (MapScreen, ScannerScreen, PaymentScreen)
├── src/components/ (QRScanner, LocationPicker, PaymentMethods)
├── src/services/ (apiService, locationService, notificationService)
└── src/navigation/ (role-based navigation stacks)
```

## Testing Strategy

**Contract Tests**: API endpoint schemas with failing tests initially (TDD)
**Integration Tests**: End-to-end user flows (QR scan → payment → session)
**Mobile Tests**: Camera permissions, location services, offline sync
**Performance Tests**: 1000+ concurrent QR scans, geospatial query optimization

## Recent Changes

- [2025-09-22] Phase 1 design completed: data models, API contracts, quickstart guide
- [2025-09-22] Research completed: tech stack decisions documented
- [2025-09-22] Implementation plan created with multi-region deployment strategy

---

*Constitution: Clarity > Cleverness, Interoperability First, Security by Design, Test-Driven Development, Future-Ready Evolution*