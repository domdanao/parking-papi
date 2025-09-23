# 🧪 Parking Papi Testing Guide

This guide provides systematic testing instructions for all platform features across web, mobile, and API endpoints.

## 📋 Pre-Testing Setup

### 1. Environment Setup

```bash
# Ensure development environment is running
php artisan serve
npm run dev

# In another terminal, start mobile app
cd mobile/expo-app
npx expo start
```

### 2. Database Preparation

```bash
# Fresh database with test data
php artisan migrate:fresh --seed

# Or run specific seeders
php artisan db:seed --class=UserSeeder
php artisan db:seed --class=ParkingSlotSeeder
```

### 3. Test User Accounts

After seeding, you'll have these test accounts:

```
Vehicle Owner:
Email: driver@example.com
Password: password

Slot Owner:
Email: owner@example.com
Password: password

Platform Owner:
Email: admin@example.com
Password: password

Enforcer:
Email: enforcer@example.com
Password: password
```

## 🌐 Web Application Testing

### Authentication Flow

**Test Registration:**
1. Go to `http://localhost:8000/register`
2. Fill form: Name, Email, Mobile (+63 format), Password, Role
3. Verify OTP flow (check logs for OTP code)
4. Confirm successful registration and login

**Test Login:**
1. Go to `http://localhost:8000/login`
2. Use test credentials above
3. Verify role-based dashboard redirect

### Vehicle Owner Flow

**Dashboard Access:**
1. Login as `driver@example.com`
2. Verify dashboard shows:
   - Available parking slots map
   - Recent parking sessions
   - Digital wallet balance
   - Quick actions

**Find Parking Slots:**
1. Click "Find Parking" or use search
2. Enter location or use current location
3. Apply filters (price range, distance, amenities)
4. Verify results show on map and list
5. Check real-time availability updates

**QR Code Scanning Simulation:**
1. Find a parking slot with QR code
2. Click "Scan QR Code" button
3. Use QR code data from database:
   ```sql
   SELECT qr_data FROM qr_codes WHERE parking_slot_id = 'slot-uuid';
   ```
4. Verify slot information display
5. Test location validation (should work if coordinates match)

**Payment Flow:**
1. After QR scan, proceed to payment
2. Select payment method (wallet/card)
3. Confirm parking duration
4. Process payment
5. Verify session creation and confirmation code

**Session Management:**
1. View active parking sessions
2. Test session extension
3. Test early checkout
4. Verify refund calculations

### Slot Owner Flow

**Login & Dashboard:**
1. Login as `owner@example.com`
2. Verify dashboard shows:
   - Owned parking slots
   - Revenue analytics
   - Recent bookings
   - Performance metrics

**Slot Registration:**
1. Click "Add New Slot"
2. Fill slot details:
   - Location (drag map marker)
   - Hourly rate
   - Availability schedule
   - Amenities/features
3. Submit for approval
4. Verify slot status is "submitted"

**Slot Management:**
1. View existing slots
2. Edit slot details
3. Update availability status
4. View booking history

**Analytics Review:**
1. Check revenue dashboard
2. Verify occupancy charts
3. Review performance recommendations
4. Test date range filters

### Platform Owner Flow

**Admin Dashboard:**
1. Login as `admin@example.com`
2. Verify admin dashboard shows:
   - Platform-wide metrics
   - Pending approvals
   - User management
   - System health

**Slot Approval Process:**
1. Go to "Pending Approvals"
2. Review submitted slots
3. Approve/reject with comments
4. Verify QR code generation on approval

**User Management:**
1. View all users
2. Search and filter users
3. View user details and activity
4. Test user status changes

**Analytics & Reports:**
1. Platform revenue overview
2. User growth metrics
3. Geographic distribution
4. Commission tracking

## 📱 Mobile App Testing

### Setup Mobile Testing

**Expo Go Method:**
1. Install Expo Go on your phone
2. Scan QR code from `npx expo start`
3. App should load on your device

**Development Build Method:**
```bash
# Create development build
eas build --profile development --platform ios # or android
# Install on device after build completes
```

### Mobile Authentication

**Registration:**
1. Open app
2. Tap "Sign Up"
3. Fill registration form
4. Test OTP verification
5. Verify successful login

**Login:**
1. Use test credentials
2. Verify role-based navigation

### QR Code Scanning

**Camera Permissions:**
1. First time opening scanner
2. Grant camera permissions
3. Verify camera view loads

**QR Scanning Flow:**
1. Generate test QR code:
   ```bash
   # In Laravel tinker
   php artisan tinker
   $slot = \App\Models\ParkingSlot::first();
   $qrCode = \App\Services\QRCodeService::generateCode($slot);
   echo $qrCode->qr_data;
   ```
2. Create QR code image from data
3. Scan with mobile app
4. Verify slot information display
5. Test location validation (may fail in simulator)

**Location Services:**
1. Grant location permissions
2. Verify current location detection
3. Test location-based slot search
4. Verify distance calculations

### Mobile Payment Flow

**Wallet Integration:**
1. View wallet balance
2. Test top-up flow
3. Process parking payment
4. Verify transaction history

**Offline Functionality:**
1. Turn off internet connection
2. Verify app continues to work
3. Test cached slot data
4. Verify offline transaction queuing
5. Reconnect and verify sync

### Push Notifications

**Setup:**
1. Grant notification permissions
2. Start a parking session
3. Verify parking expiration notifications
4. Test different notification types

## 🔗 API Testing

### Using curl Commands

**Authentication API:**
```bash
# Register new user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "mobile_number": "+639123456789",
    "password": "password",
    "password_confirmation": "password",
    "role": "vehicle_owner"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "password": "password"
  }'

# Save the token from response for subsequent requests
export TOKEN="your-auth-token-here"
```

**Parking Slots API:**
```bash
# Find nearby slots
curl -X GET "http://localhost:8000/api/parking-slots/nearby?lat=14.5995&lng=120.9842&radius=1000" \
  -H "Authorization: Bearer $TOKEN"

# Get slot details
curl -X GET "http://localhost:8000/api/parking-slots/slot-uuid-here" \
  -H "Authorization: Bearer $TOKEN"
```

**QR Scanning API:**
```bash
# Scan QR code
curl -X POST http://localhost:8000/api/qr/scan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_data": "qr-code-data-from-database",
    "location": {
      "latitude": 14.5995,
      "longitude": 120.9842
    }
  }'

# Activate payment
curl -X POST http://localhost:8000/api/qr/activate-payment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_token": "session-token-from-scan",
    "payment_method": "wallet",
    "duration_hours": 2
  }'
```

### Using Postman/Insomnia

Import this collection for comprehensive API testing:

```json
{
  "info": {
    "name": "Parking Papi API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:8000/api"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"mobile_number\": \"+639123456789\",\n  \"password\": \"password\",\n  \"password_confirmation\": \"password\",\n  \"role\": \"vehicle_owner\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/auth/register",
              "host": ["{{base_url}}"],
              "path": ["auth", "register"]
            }
          }
        }
      ]
    }
  ]
}
```

## 🧪 Automated Testing

### Run Test Suites

**Backend Tests:**
```bash
# All tests
php artisan test

# Specific test categories
php artisan test --testsuite=Feature
php artisan test --testsuite=Unit

# Specific test files
php artisan test tests/Feature/AuthenticationApiTest.php
php artisan test tests/Feature/ParkingSlotsApiTest.php
php artisan test tests/Feature/QRScanningApiTest.php
php artisan test tests/Feature/PaymentsApiTest.php
```

**Frontend Tests:**
```bash
# Component tests
npm test

# E2E tests
npm run test:e2e

# Visual testing
npm run test:e2e:ui
```

**Mobile Tests:**
```bash
cd mobile/expo-app

# Unit tests
npm test

# E2E tests (if device connected)
npm run test:detox:ios
npm run test:detox:android
```

**Performance Tests:**
```bash
# Load testing
npm run test:performance

# Or manually with k6
k6 run tests/performance/parking-load-test.js
```

## 🔍 Real-time Features Testing

### WebSocket Testing

**Setup Echo Testing:**
1. Open browser developer console
2. Execute:
   ```javascript
   // Test connection
   Echo.connector.pusher.connection.bind('connected', () => {
     console.log('WebSocket connected!');
   });

   // Listen to parking area updates
   Echo.channel('parking-area-1')
     .listen('SlotStatusChanged', (e) => {
       console.log('Slot status changed:', e);
     });
   ```

**Test Real-time Updates:**
1. Open two browser windows
2. In one window, change slot availability
3. Verify other window receives real-time update
4. Test with mobile app simultaneously

### Testing Broadcasting Events

**Trigger Events Manually:**
```bash
# In Laravel tinker
php artisan tinker

# Broadcast slot status change
$slot = \App\Models\ParkingSlot::first();
broadcast(new \App\Events\SlotStatusChanged($slot, 'occupied'));

# Broadcast notification
$user = \App\Models\User::first();
broadcast(new \App\Events\ParkingExpirationWarning($user, 'session-id', 15));
```

## 📊 Performance Testing

### Database Performance

**Test Geospatial Queries:**
```sql
-- Test nearby slots performance
EXPLAIN ANALYZE SELECT * FROM parking_slots
WHERE (
  6371 * acos(
    cos(radians(14.5995)) * cos(radians(latitude)) *
    cos(radians(longitude) - radians(120.9842)) +
    sin(radians(14.5995)) * sin(radians(latitude))
  )
) <= 1;
```

**Load Test Database:**
```bash
# Create test data
php artisan db:seed --class=PerformanceTestSeeder

# Run concurrent operations
for i in {1..10}; do
  php artisan tinker --execute="
    \App\Models\ParkingSlot::factory(100)->create();
  " &
done
```

### Memory & Performance Monitoring

**Monitor During Testing:**
```bash
# Monitor PHP processes
watch -n 1 'ps aux | grep php'

# Monitor database connections
watch -n 1 'pg_stat_activity | wc -l'

# Monitor Redis
redis-cli monitor
```

## 🐛 Common Issues & Debugging

### Database Issues

**Connection Problems:**
```bash
# Check database connection
php artisan tinker
DB::connection()->getPdo();
```

**Missing Data:**
```bash
# Re-seed if needed
php artisan migrate:fresh --seed
```

### API Issues

**Token Problems:**
- Check token format in Authorization header
- Verify token hasn't expired
- Check user role permissions

**CORS Issues:**
- Verify API is accessible from mobile app
- Check CORS configuration in Laravel

### Mobile Issues

**Camera Not Working:**
- Check device permissions
- Test on physical device (camera doesn't work in simulator)
- Verify expo-camera installation

**Location Services:**
- Grant location permissions
- Test on physical device
- Check location service configuration

### Real-time Issues

**WebSocket Connection:**
```bash
# Check Reverb server
php artisan reverb:start

# Verify broadcasting configuration
php artisan config:cache
```

## ✅ Testing Checklist

### Core Functionality
- [ ] User registration and authentication
- [ ] Role-based access control
- [ ] Parking slot search and filtering
- [ ] QR code scanning flow
- [ ] Payment processing
- [ ] Session management
- [ ] Real-time updates

### Mobile Specific
- [ ] Camera permissions and QR scanning
- [ ] Location services integration
- [ ] Offline functionality
- [ ] Push notifications
- [ ] Cross-platform compatibility

### Admin Features
- [ ] Slot approval workflow
- [ ] User management
- [ ] Analytics and reporting
- [ ] System monitoring

### Performance
- [ ] Database query performance
- [ ] Real-time update responsiveness
- [ ] Mobile app performance
- [ ] Concurrent user handling

### Security
- [ ] Authentication and authorization
- [ ] Location validation
- [ ] Payment security
- [ ] Data protection

## 📝 Reporting Issues

When you find issues during testing:

1. **Document the Issue:**
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots/logs

2. **Check Logs:**
   ```bash
   # Laravel logs
   tail -f storage/logs/laravel.log

   # Mobile logs (if using Expo)
   npx expo logs
   ```

3. **Create GitHub Issue:**
   - Use appropriate labels (bug, enhancement, etc.)
   - Include full reproduction steps
   - Attach relevant screenshots

---

Happy testing! 🚀 This comprehensive guide should help you thoroughly evaluate all aspects of the Parking Papi platform.