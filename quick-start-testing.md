# 🚀 Quick Start Testing Instructions

## 30-Second Setup

```bash
# 1. Start Laravel server
php artisan serve

# 2. Start frontend dev server (new terminal)
npm run dev

# 3. Run automated tests (new terminal)
./test-script.sh quick
```

## 5-Minute Manual Test

### 1. Web Authentication Test
```bash
# Open browser: https://parking-papi.test
# Login with: driver@example.com / password
# Verify dashboard loads with parking slots
```

### 2. API Test
```bash
# Test auth endpoint
curl -X POST https://parking-papi.test/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "driver@example.com", "password": "password", "device_name": "test-device"}'

# Should return: {"success": true, "token": "...", "user": {...}}
```

### 3. Mobile App Test
```bash
cd mobile/expo-app
npx expo start

# Scan QR code with Expo Go app
# or open in iOS Simulator/Android Emulator
```

## Key Test Accounts

```
Vehicle Owner: driver@example.com / password
Slot Owner: owner@example.com / password
Admin: admin@example.com / password
Enforcer: enforcer@example.com / password
```

## Critical Features to Test

**✅ Authentication:** Registration, login, role-based access
**✅ Parking Flow:** Find slots → QR scan → Payment → Session
**✅ Real-time:** Slot status updates across multiple browsers
**✅ Mobile:** Camera QR scanning, location services
**✅ Admin:** Slot approval, user management, analytics

## Quick Issue Checks

**Database Issues:**
```bash
php artisan migrate:fresh --seed
```

**Frontend Issues:**
```bash
npm run build && npm run dev
```

**Mobile Issues:**
```bash
cd mobile/expo-app && npm install && npx expo start
```

## Success Indicators

- ✅ Web dashboard loads without errors
- ✅ API returns valid JSON responses
- ✅ Mobile app starts successfully
- ✅ Database queries execute under 100ms
- ✅ Real-time updates work between browser tabs
- ✅ All test suites pass

---

**Need help?** Check `TESTING-GUIDE.md` for comprehensive testing instructions!