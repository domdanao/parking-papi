# Quickstart Guide: Street Parking Platform

**Generated**: 2025-09-22 | **For Feature**: Street Parking Platform

## Overview

This quickstart guide demonstrates the core user flows for the three-sided parking marketplace platform. Follow these scenarios to validate the implementation works correctly.

---

## Prerequisites

- **Backend**: Laravel 11.x with PostgreSQL and Redis
- **Frontend**: Inertia.js + React with TypeScript
- **Mobile**: Expo React Native app
- **Payment**: Magpie payment gateway (via MCP server)
- **Authentication**: Laravel Sanctum tokens

---

## Core User Flows

### 1. Vehicle Owner Journey: Find and Pay for Parking

#### Web/PWA Flow

**Step 1: Registration and Mobile Verification**
```bash
# Test user registration
curl -X POST https://api.parkingplatform.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "+1234567890",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "password": "SecurePass123!",
    "password_confirmation": "SecurePass123!",
    "role": "vehicle_owner",
    "device_name": "Test Device"
  }'

# Expected: 201 Created with OTP requirement
# Verify mobile number with OTP
curl -X POST https://api.parkingplatform.com/v1/auth/verify-otp \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "+1234567890",
    "otp_code": "123456"
  }'
```

**Step 2: Find Nearby Parking Slots**
```bash
# Search for parking near specific location
curl -X GET "https://api.parkingplatform.com/v1/parking-slots/nearby?latitude=40.7128&longitude=-74.0060&radius=1000&vehicle_type=car" \
  -H "Authorization: Bearer {token}"

# Expected: 200 OK with list of available slots within 1km
# Response should include: slot details, pricing, amenities, distance
```

**Step 3: QR Code Scanning and Payment**
```bash
# Simulate QR code scan
curl -X POST https://api.parkingplatform.com/v1/qr/scan \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_data": "eyJzbG90X2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIn0=",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 10.0
    },
    "scan_timestamp": "2025-09-22T14:30:00Z"
  }'

# Expected: 200 OK with slot info and session token

# Activate parking session with payment
curl -X POST https://api.parkingplatform.com/v1/qr/activate-payment \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "scan_id": "{scan_id_from_previous_response}",
    "session_token": "{session_token}",
    "duration_minutes": 120,
    "payment_method": {
      "type": "wallet",
      "payment_method_id": "{wallet_id}"
    },
    "auto_extend": false
  }'

# Expected: 201 Created with active parking session
```

**Step 4: Session Management**
```bash
# Check current sessions
curl -X GET https://api.parkingplatform.com/v1/parking-sessions/current \
  -H "Authorization: Bearer {token}"

# Extend parking session
curl -X POST https://api.parkingplatform.com/v1/parking-sessions/{session_id}/extend \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "additional_minutes": 60,
    "payment_method": {
      "type": "wallet"
    }
  }'

# Expected: 200 OK with updated session details
```

#### Mobile App Flow (Expo)

**React Native Components to Test:**
```jsx
// Test QR scanner component
import { CameraView } from 'expo-camera';

function QRScannerTest() {
  const handleScan = (data) => {
    // Should trigger API call to /qr/scan
    console.log('QR Data:', data);
  };

  return (
    <CameraView
      onBarcodeScanned={handleScan}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
    />
  );
}

// Test location services
import * as Location from 'expo-location';

async function testLocationServices() {
  const location = await Location.getCurrentPositionAsync();
  console.log('Current location:', location);

  // Should trigger nearby slots search
  const response = await api.get('/parking-slots/nearby', {
    params: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      radius: 1000
    }
  });

  console.log('Nearby slots:', response.data);
}
```

### 2. Slot Owner Journey: Register and Manage Parking Slots

**Step 1: Slot Owner Registration**
```bash
# Register as slot owner
curl -X POST https://api.parkingplatform.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "+1987654321",
    "email": "slotowner@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "password": "SecurePass123!",
    "password_confirmation": "SecurePass123!",
    "role": "slot_owner",
    "device_name": "Owner Device"
  }'
```

**Step 2: Register Parking Slot**
```bash
# Create new parking slot with file uploads
curl -X POST https://api.parkingplatform.com/v1/parking-slots \
  -H "Authorization: Bearer {slot_owner_token}" \
  -F "slot_number=A-123" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "address=123 Main St, New York, NY 10001" \
  -F "dimensions[length_meters]=5.0" \
  -F "dimensions[width_meters]=2.5" \
  -F "surface_type=asphalt" \
  -F "vehicle_compatibility[]=car" \
  -F "vehicle_compatibility[]=motorcycle" \
  -F "base_hourly_rate=15.00" \
  -F "minimum_duration_minutes=30" \
  -F "maximum_duration_minutes=480" \
  -F "amenities[]=covered" \
  -F "amenities[]=secured" \
  -F "photos=@slot_photo_1.jpg" \
  -F "photos=@slot_photo_2.jpg" \
  -F "ownership_documents=@ownership_deed.pdf"

# Expected: 201 Created with slot in "submitted" status
```

**Step 3: Slot Performance Analytics**
```bash
# Get slot performance metrics
curl -X GET "https://api.parkingplatform.com/v1/analytics/slot-performance?period=month&slot_id={slot_id}" \
  -H "Authorization: Bearer {slot_owner_token}"

# Expected: 200 OK with detailed analytics
# Should include: revenue, occupancy rates, session counts, recommendations

# Get revenue breakdown
curl -X GET "https://api.parkingplatform.com/v1/analytics/revenue?period=month&breakdown_by=time" \
  -H "Authorization: Bearer {slot_owner_token}"

# Expected: 200 OK with revenue trends and forecasting
```

### 3. Platform Owner Journey: Slot Approval and System Management

**Step 1: Platform Admin Authentication**
```bash
# Login as platform administrator
curl -X POST https://api.parkingplatform.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@parkingplatform.com",
    "password": "AdminSecurePass123!",
    "device_name": "Admin Console"
  }'
```

**Step 2: Slot Review and Approval**
```bash
# Get pending slot approvals
curl -X GET "https://api.parkingplatform.com/v1/admin/slots/pending" \
  -H "Authorization: Bearer {admin_token}"

# Approve a parking slot
curl -X PUT https://api.parkingplatform.com/v1/admin/slots/{slot_id}/approve \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "notes": "Slot approved after document verification",
    "generate_qr_code": true
  }'

# Expected: 200 OK with approved slot and generated QR code
```

**Step 3: Platform Analytics**
```bash
# Get platform health metrics
curl -X GET "https://api.parkingplatform.com/v1/analytics/platform-health?period=today&include_alerts=true" \
  -H "Authorization: Bearer {admin_token}"

# Expected: 200 OK with KPI dashboard, system health, alerts

# Get customer behavior analytics
curl -X GET "https://api.parkingplatform.com/v1/analytics/customer-behavior?period=month&segment_by=frequency" \
  -H "Authorization: Bearer {admin_token}"

# Expected: 200 OK with user segmentation and behavior patterns
```

### 4. Real-time Features Testing

**WebSocket Connection (Laravel Reverb)**
```javascript
// Test real-time slot updates
import Echo from 'laravel-echo';

const echo = new Echo({
  broadcaster: 'reverb',
  key: process.env.REVERB_APP_KEY,
  host: process.env.REVERB_HOST,
  port: process.env.REVERB_PORT,
});

// Listen for slot availability changes
echo.channel('parking-area-1')
  .listen('SlotStatusChanged', (e) => {
    console.log('Slot status changed:', e);
    // Should receive real-time updates when slots become available/occupied
  });

// Test private channel for user notifications
echo.private(`user.${userId}`)
  .listen('ParkingExpirationWarning', (e) => {
    console.log('Parking expiring soon:', e);
    // Should receive notification 15 minutes before expiry
  });
```

**Push Notifications (Expo)**
```javascript
// Test push notification registration
import * as Notifications from 'expo-notifications';

async function testPushNotifications() {
  const token = await Notifications.getExpoPushTokenAsync();

  // Register token with Laravel backend
  await api.post('/push-subscriptions', {
    subscription: token
  });

  // Should receive parking expiration notifications
}
```

### 5. Payment Integration Testing

**Wallet Operations**
```bash
# Top up digital wallet
curl -X POST https://api.parkingplatform.com/v1/wallet/top-up \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "payment_method_id": "{saved_card_id}"
  }'

# Expected: 200 OK with updated wallet balance

# Configure auto top-up
curl -X PUT https://api.parkingplatform.com/v1/wallet/auto-topup \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "threshold_amount": 10.00,
    "topup_amount": 25.00,
    "payment_method_id": "{default_card_id}"
  }'

# Expected: 200 OK with updated wallet settings
```

### 6. Offline Functionality Testing (PWA)

**Service Worker Cache Validation**
```javascript
// Test offline slot data caching
navigator.serviceWorker.ready.then(registration => {
  // Simulate going offline
  navigator.serviceWorker.controller.postMessage({
    command: 'test-offline-mode'
  });

  // Try to fetch nearby slots while offline
  fetch('/api/parking-slots/nearby?lat=40.7128&lng=-74.0060')
    .then(response => response.json())
    .then(data => {
      console.log('Offline slots data:', data);
      // Should return cached data
    });
});

// Test offline payment queue
async function testOfflinePayment() {
  // Queue payment while offline
  await paymentService.queueOfflinePayment({
    amount: 15.00,
    sessionId: 'session-123',
    paymentMethod: 'wallet'
  });

  // When back online, payment should sync automatically
  window.addEventListener('online', () => {
    paymentService.syncOfflinePayments();
  });
}
```

---

## Validation Checklist

### Core Functionality
- [ ] User registration and OTP verification works
- [ ] QR code scanning triggers correct API calls
- [ ] Payment processing completes successfully
- [ ] Real-time slot updates work via WebSocket
- [ ] Push notifications sent for parking expiration
- [ ] Offline functionality maintains basic features

### User Flows
- [ ] Vehicle owner can find and book parking
- [ ] Slot owner can register and manage slots
- [ ] Platform admin can approve slots and view analytics
- [ ] Payment and wallet operations function correctly

### Performance Targets
- [ ] API responses < 200ms average
- [ ] QR scan to payment < 3 seconds
- [ ] Real-time updates < 1 second latency
- [ ] Mobile app launches < 2 seconds

### Security Validation
- [ ] JWT tokens expire correctly
- [ ] Payment data is encrypted
- [ ] OTP verification prevents unauthorized access
- [ ] Role-based permissions enforced

### Mobile App (Expo)
- [ ] QR scanner works with device camera
- [ ] Location services provide accurate coordinates
- [ ] Push notifications work on both iOS and Android
- [ ] Offline storage syncs when reconnected

---

## Troubleshooting

### Common Issues

**QR Code Scanning Fails**
- Verify camera permissions granted
- Check QR code format and expiration
- Ensure network connectivity for API calls

**Payment Processing Errors**
- Validate Magpie MCP server connection
- Check wallet balance and payment method status
- Review transaction logs for gateway errors

**Real-time Updates Not Working**
- Confirm Laravel Reverb configuration
- Check WebSocket connection in browser dev tools
- Verify event broadcasting setup

**Offline Mode Issues**
- Clear service worker cache and re-register
- Check IndexedDB storage in browser dev tools
- Validate offline queue synchronization

### Debug Commands

```bash
# Check Laravel logs
tail -f storage/logs/laravel.log

# Monitor Redis activity
redis-cli monitor

# Test database connections
php artisan tinker
>>> DB::connection()->getPdo()

# Validate queue processing
php artisan queue:work --verbose

# Check Reverb WebSocket server
php artisan reverb:start --debug
```

---

This quickstart guide validates that all core user journeys work correctly across web, mobile, and administrative interfaces. Follow each scenario end-to-end to ensure the parking platform functions as specified in the requirements.