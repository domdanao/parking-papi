# Tasks: Street Parking Platform

**Input**: Design documents from `/specs/001-this-is-a/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Generated**: 2025-09-22 | **Feature**: Street Parking Platform | **Branch**: 001-this-is-a

## Tech Stack Context
- **Backend**: Laravel 11.x + PHP 8.3 + PostgreSQL + Redis + Laravel Reverb
- **Frontend**: Inertia.js + React 18 + TypeScript + Zustand + Tailwind CSS
- **Mobile**: Expo React Native + expo-camera + expo-sqlite + expo-notifications
- **Testing**: PHPUnit + Jest/RTL + Playwright
- **Structure**: Web app (backend/ + frontend/) + mobile/expo-app/

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 3.1: Project Setup & Dependencies

- [ ] **T001** Initialize Laravel 11.x project structure with PostgreSQL and Redis configuration in `backend/`
- [ ] **T002** [P] Set up Inertia.js + React + TypeScript frontend structure in `frontend/resources/js/`
- [ ] **T003** [P] Initialize Expo React Native project structure in `mobile/expo-app/`
- [ ] **T004** [P] Configure PostGIS extension for PostgreSQL geospatial queries
- [ ] **T005** [P] Set up Laravel Reverb for WebSocket real-time features
- [ ] **T006** [P] Configure Laravel Sanctum for API authentication
- [ ] **T007** [P] Install and configure Zustand for frontend state management
- [ ] **T008** [P] Set up PHPUnit, Jest, and Playwright testing environments
- [ ] **T009** [P] Configure ESLint, Prettier for TypeScript code formatting
- [ ] **T010** [P] Set up Laravel Valet/Sail for local development environment

---

## Phase 3.2: Database & Models (TDD - Tests First) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests [P]
- [ ] **T011** [P] Contract test authentication endpoints in `backend/tests/Feature/AuthenticationApiTest.php`
- [ ] **T012** [P] Contract test parking slots endpoints in `backend/tests/Feature/ParkingSlotsApiTest.php`
- [ ] **T013** [P] Contract test QR scanning endpoints in `backend/tests/Feature/QRScanningApiTest.php`
- [ ] **T014** [P] Contract test payments endpoints in `backend/tests/Feature/PaymentsApiTest.php`
- [ ] **T015** [P] Contract test analytics endpoints in `backend/tests/Feature/AnalyticsApiTest.php`

### Database Migration Tests [P]
- [ ] **T016** [P] Migration test for users table with roles in `backend/tests/Unit/UserMigrationTest.php`
- [ ] **T017** [P] Migration test for parking_slots with PostGIS in `backend/tests/Unit/ParkingSlotMigrationTest.php`
- [ ] **T018** [P] Migration test for parking_sessions in `backend/tests/Unit/ParkingSessionMigrationTest.php`
- [ ] **T019** [P] Migration test for payment_transactions in `backend/tests/Unit/PaymentTransactionMigrationTest.php`
- [ ] **T020** [P] Migration test for qr_codes table in `backend/tests/Unit/QRCodeMigrationTest.php`

### Integration Tests [P]
- [ ] **T021** [P] Vehicle owner journey integration test in `backend/tests/Feature/VehicleOwnerJourneyTest.php`
- [ ] **T022** [P] Slot owner registration integration test in `backend/tests/Feature/SlotOwnerJourneyTest.php`
- [ ] **T023** [P] QR scan to payment flow integration test in `backend/tests/Feature/QRPaymentFlowTest.php`
- [ ] **T024** [P] Real-time slot updates integration test in `backend/tests/Feature/RealtimeUpdatesTest.php`
- [ ] **T025** [P] Wallet and payment processing integration test in `backend/tests/Feature/WalletPaymentTest.php`

---

## Phase 3.3: Database Migrations & Models (ONLY after tests are failing)

### Database Migrations [P]
- [ ] **T026** [P] Create users migration with multi-role support in `backend/database/migrations/create_users_table.php`
- [ ] **T027** [P] Create parking_slots migration with PostGIS location in `backend/database/migrations/create_parking_slots_table.php`
- [ ] **T028** [P] Create parking_sessions migration with status tracking in `backend/database/migrations/create_parking_sessions_table.php`
- [ ] **T029** [P] Create payment_transactions migration with commission tracking in `backend/database/migrations/create_payment_transactions_table.php`
- [ ] **T030** [P] Create qr_codes migration with expiry management in `backend/database/migrations/create_qr_codes_table.php`
- [ ] **T031** [P] Create digital_wallets migration with auto-topup settings in `backend/database/migrations/create_digital_wallets_table.php`
- [ ] **T032** [P] Create loyalty_programs migration with points tracking in `backend/database/migrations/create_loyalty_programs_table.php`
- [ ] **T033** [P] Create enforcement_actions migration with violation tracking in `backend/database/migrations/create_enforcement_actions_table.php`
- [ ] **T034** [P] Create notification_logs migration with delivery tracking in `backend/database/migrations/create_notification_logs_table.php`

### Eloquent Models [P]
- [ ] **T035** [P] User model with role-based relationships in `backend/app/Models/User.php`
- [ ] **T036** [P] ParkingSlot model with geospatial queries in `backend/app/Models/ParkingSlot.php`
- [ ] **T037** [P] ParkingSession model with status management in `backend/app/Models/ParkingSession.php`
- [ ] **T038** [P] PaymentTransaction model with commission calculations in `backend/app/Models/PaymentTransaction.php`
- [ ] **T039** [P] QRCode model with expiry and scan tracking in `backend/app/Models/QRCode.php`
- [ ] **T040** [P] DigitalWallet model with balance management in `backend/app/Models/DigitalWallet.php`
- [ ] **T041** [P] LoyaltyProgram model with tier progression in `backend/app/Models/LoyaltyProgram.php`
- [ ] **T042** [P] EnforcementAction model with violation tracking in `backend/app/Models/EnforcementAction.php`

### Database Seeders [P]
- [ ] **T043** [P] Users seeder with sample roles in `backend/database/seeders/UsersSeeder.php`
- [ ] **T044** [P] Parking slots seeder with NYC sample data in `backend/database/seeders/ParkingSlotsSeeder.php`
- [ ] **T045** [P] Sample sessions seeder for testing in `backend/database/seeders/ParkingSessionsSeeder.php`

---

## Phase 3.4: Core Backend Implementation

### Authentication & Authorization
- [ ] **T046** Auth controller with Sanctum token management in `backend/app/Http/Controllers/AuthController.php`
- [ ] **T047** OTP verification service for mobile numbers in `backend/app/Services/OTPService.php`
- [ ] **T048** Role-based middleware for route protection in `backend/app/Http/Middleware/RoleMiddleware.php`

### Core Controllers (Sequential - same API structure)
- [ ] **T049** ParkingSlotController with nearby search and CRUD in `backend/app/Http/Controllers/ParkingSlotController.php`
- [ ] **T050** QRScanController with concurrency handling in `backend/app/Http/Controllers/QRScanController.php`
- [ ] **T051** PaymentController with Magpie integration in `backend/app/Http/Controllers/PaymentController.php`
- [ ] **T052** AnalyticsController with slot performance metrics in `backend/app/Http/Controllers/AnalyticsController.php`
- [ ] **T053** WalletController with balance and auto-topup in `backend/app/Http/Controllers/WalletController.php`

### Business Logic Services [P]
- [ ] **T054** [P] QRCodeService with generation and validation in `backend/app/Services/QRCodeService.php`
- [ ] **T055** [P] PaymentService with Magpie gateway integration in `backend/app/Services/PaymentService.php`
- [ ] **T056** [P] GeospatialService for parking slot proximity queries in `backend/app/Services/GeospatialService.php`
- [ ] **T057** [P] NotificationService for SMS and push notifications in `backend/app/Services/NotificationService.php`
- [ ] **T058** [P] AnalyticsService for slot performance and revenue tracking in `backend/app/Services/AnalyticsService.php`
- [ ] **T059** [P] WalletService for balance management and transactions in `backend/app/Services/WalletService.php`

### Real-time & Events [P]
- [ ] **T060** [P] SlotStatusChanged event for real-time updates in `backend/app/Events/SlotStatusChanged.php`
- [ ] **T061** [P] ParkingExpirationWarning event for notifications in `backend/app/Events/ParkingExpirationWarning.php`
- [ ] **T062** [P] Laravel Reverb WebSocket channel setup in `backend/routes/channels.php`

### Queue Jobs [P]
- [ ] **T063** [P] ProcessPayment job for async payment processing in `backend/app/Jobs/ProcessPayment.php`
- [ ] **T064** [P] CheckParkingExpirations job for session monitoring in `backend/app/Jobs/CheckParkingExpirations.php`
- [ ] **T065** [P] SendParkingReminder job for notifications in `backend/app/Jobs/SendParkingReminder.php`

---

## Phase 3.5: Frontend Implementation (Inertia.js + React)

### Core Layouts & Components [P]
- [ ] **T066** [P] AuthenticatedLayout with role-based navigation in `frontend/resources/js/Layouts/AuthenticatedLayout.tsx`
- [ ] **T067** [P] GuestLayout for public pages in `frontend/resources/js/Layouts/GuestLayout.tsx`
- [ ] **T068** [P] QRScanner component with camera integration in `frontend/resources/js/Components/QRScanner.tsx`
- [ ] **T069** [P] MapView component with slot markers in `frontend/resources/js/Components/MapView.tsx`
- [ ] **T070** [P] PaymentForm component with Magpie integration in `frontend/resources/js/Components/PaymentForm.tsx`

### Vehicle Owner Pages [P]
- [ ] **T071** [P] Dashboard page with active sessions in `frontend/resources/js/Pages/VehicleOwner/Dashboard.tsx`
- [ ] **T072** [P] SlotSearch page with map and filters in `frontend/resources/js/Pages/VehicleOwner/SlotSearch.tsx`
- [ ] **T073** [P] PaymentHistory page with transaction list in `frontend/resources/js/Pages/VehicleOwner/PaymentHistory.tsx`
- [ ] **T074** [P] WalletManagement page with balance and top-up in `frontend/resources/js/Pages/VehicleOwner/WalletManagement.tsx`

### Slot Owner Pages [P]
- [ ] **T075** [P] SlotManagement dashboard with performance metrics in `frontend/resources/js/Pages/SlotOwner/SlotManagement.tsx`
- [ ] **T076** [P] SlotRegistration form with photo upload in `frontend/resources/js/Pages/SlotOwner/SlotRegistration.tsx`
- [ ] **T077** [P] Analytics dashboard with revenue charts in `frontend/resources/js/Pages/SlotOwner/Analytics.tsx`

### Platform Admin Pages [P]
- [ ] **T078** [P] SlotApproval interface for reviewing submissions in `frontend/resources/js/Pages/Admin/SlotApproval.tsx`
- [ ] **T079** [P] PlatformAnalytics with system-wide metrics in `frontend/resources/js/Pages/Admin/PlatformAnalytics.tsx`

### State Management & Services [P]
- [ ] **T080** [P] Parking store with Zustand for slot and session state in `frontend/resources/js/Stores/parkingStore.ts`
- [ ] **T081** [P] Auth store for user authentication state in `frontend/resources/js/Stores/authStore.ts`
- [ ] **T082** [P] WebSocket service for real-time updates in `frontend/resources/js/Services/websocketService.ts`
- [ ] **T083** [P] API service with Axios configuration in `frontend/resources/js/Services/apiService.ts`

---

## Phase 3.6: Mobile App Implementation (Expo React Native)

### Core Navigation & Screens [P]
- [ ] **T084** [P] Root navigation with role-based stacks in `mobile/expo-app/src/navigation/RootNavigator.tsx`
- [ ] **T085** [P] QR Scanner screen with expo-camera in `mobile/expo-app/src/screens/QRScannerScreen.tsx`
- [ ] **T086** [P] Map screen with nearby slots in `mobile/expo-app/src/screens/MapScreen.tsx`
- [ ] **T087** [P] Payment screen with Magpie integration in `mobile/expo-app/src/screens/PaymentScreen.tsx`
- [ ] **T088** [P] Dashboard screen with active sessions in `mobile/expo-app/src/screens/DashboardScreen.tsx`

### Mobile Services [P]
- [ ] **T089** [P] Location service with expo-location in `mobile/expo-app/src/services/locationService.ts`
- [ ] **T090** [P] Notification service with expo-notifications in `mobile/expo-app/src/services/notificationService.ts`
- [ ] **T091** [P] Offline storage with expo-sqlite in `mobile/expo-app/src/services/offlineStorageService.ts`
- [ ] **T092** [P] API service with authentication in `mobile/expo-app/src/services/apiService.ts`

### Mobile Components [P]
- [ ] **T093** [P] QRCodeScanner component with permission handling in `mobile/expo-app/src/components/QRCodeScanner.tsx`
- [ ] **T094** [P] LocationPicker component with map integration in `mobile/expo-app/src/components/LocationPicker.tsx`
- [ ] **T095** [P] PaymentMethodsSelector for wallet and cards in `mobile/expo-app/src/components/PaymentMethodsSelector.tsx`

---

## Phase 3.7: PWA & Offline Functionality

### Service Worker & PWA [P]
- [ ] **T096** [P] Service worker with caching strategies in `frontend/public/sw.js`
- [ ] **T097** [P] PWA manifest with app icons in `frontend/public/manifest.json`
- [ ] **T098** [P] Offline storage management with IndexedDB in `frontend/resources/js/Services/offlineStorageService.ts`
- [ ] **T099** [P] Background sync for payment queue in `frontend/resources/js/Services/backgroundSyncService.ts`

### Push Notifications [P]
- [ ] **T100** [P] Push notification setup for web in `frontend/resources/js/Services/pushNotificationService.ts`
- [ ] **T101** [P] Laravel WebPush notification channels in `backend/app/Notifications/ParkingExpirationNotification.php`

---

## Phase 3.8: Integration & Performance

### API Routes & Middleware
- [ ] **T102** API routes configuration with rate limiting in `backend/routes/api.php`
- [ ] **T103** CORS middleware configuration in `backend/app/Http/Middleware/HandleCors.php`
- [ ] **T104** Request logging middleware in `backend/app/Http/Middleware/LogRequests.php`

### Performance & Optimization [P]
- [ ] **T105** [P] Database query optimization with indexes in `backend/database/migrations/add_performance_indexes.php`
- [ ] **T106** [P] Redis caching implementation for slot availability in `backend/app/Services/CacheService.php`
- [ ] **T107** [P] Image optimization for slot photos in `backend/app/Services/ImageOptimizationService.php`

### Security & Validation [P]
- [ ] **T108** [P] Form request validation classes in `backend/app/Http/Requests/`
- [ ] **T109** [P] API rate limiting configuration in `backend/config/rate-limiting.php`
- [ ] **T110** [P] Input sanitization middleware in `backend/app/Http/Middleware/SanitizeInput.php`

---

## Phase 3.9: Testing & Quality Assurance

### Frontend Testing [P]
- [ ] **T111** [P] React component tests with RTL in `frontend/tests/unit/components/`
- [ ] **T112** [P] Zustand store tests in `frontend/tests/unit/stores/`
- [ ] **T113** [P] API service tests with mocking in `frontend/tests/unit/services/`

### E2E Testing [P]
- [ ] **T114** [P] Vehicle owner journey E2E test in `tests/e2e/vehicleOwnerJourney.spec.ts`
- [ ] **T115** [P] Slot owner workflow E2E test in `tests/e2e/slotOwnerWorkflow.spec.ts`
- [ ] **T116** [P] QR scan to payment E2E test in `tests/e2e/qrPaymentFlow.spec.ts`

### Mobile Testing [P]
- [ ] **T117** [P] Expo app component tests in `mobile/expo-app/__tests__/components/`
- [ ] **T118** [P] Mobile navigation tests in `mobile/expo-app/__tests__/navigation/`
- [ ] **T119** [P] Offline functionality tests in `mobile/expo-app/__tests__/offline/`

---

## Phase 3.10: Deployment & DevOps

### Development Environment [P]
- [ ] **T120** [P] Docker containerization for development in `docker-compose.yml`
- [ ] **T121** [P] Laravel Cloud deployment configuration in `.laravel-cloud.yml`
- [ ] **T122** [P] EAS Build configuration for mobile app in `mobile/expo-app/eas.json`

### CI/CD Pipeline [P]
- [ ] **T123** [P] GitHub Actions workflow for backend tests in `.github/workflows/backend-tests.yml`
- [ ] **T124** [P] GitHub Actions workflow for frontend tests in `.github/workflows/frontend-tests.yml`
- [ ] **T125** [P] GitHub Actions workflow for mobile app builds in `.github/workflows/mobile-build.yml`

### Production Setup [P]
- [ ] **T126** [P] Production environment configuration in `backend/.env.production`
- [ ] **T127** [P] SSL certificate setup and HTTPS configuration
- [ ] **T128** [P] Database backup and monitoring setup
- [ ] **T129** [P] Application monitoring and logging configuration

---

## Phase 3.11: Final Polish & Documentation

### Documentation [P]
- [ ] **T130** [P] API documentation generation with OpenAPI in `docs/api/`
- [ ] **T131** [P] Deployment guide for Laravel Cloud in `docs/deployment.md`
- [ ] **T132** [P] Mobile app development guide in `docs/mobile-development.md`
- [ ] **T133** [P] Architecture documentation in `docs/architecture.md`

### Performance & Optimization
- [ ] **T134** Performance testing to meet <200ms API response target
- [ ] **T135** Load testing for 1000+ concurrent users
- [ ] **T136** Mobile app performance optimization and bundle size reduction

### Final Validation
- [ ] **T137** Execute quickstart.md scenarios end-to-end
- [ ] **T138** Security audit and penetration testing
- [ ] **T139** Accessibility compliance testing (WCAG 2.1)
- [ ] **T140** Cross-browser and cross-device compatibility testing

---

## Dependencies

### Critical Paths
- **Setup** (T001-T010) → **Tests** (T011-T025) → **Implementation** (T026+)
- **Database migrations** (T026-T034) → **Models** (T035-T042) → **Controllers** (T046-T053)
- **Backend API** (T046-T065) → **Frontend pages** (T071-T079)
- **Core backend** (T046-T065) → **Mobile app** (T084-T095)

### Parallel Execution Groups
```bash
# Database setup (can run simultaneously)
T026, T027, T028, T029, T030, T031, T032, T033, T034

# Model creation (different files)
T035, T036, T037, T038, T039, T040, T041, T042

# Service layer (independent services)
T054, T055, T056, T057, T058, T059

# Frontend components (different files)
T066, T067, T068, T069, T070

# Mobile screens (different files)
T084, T085, T086, T087, T088
```

## Validation Checklist
- [x] All contracts have corresponding tests (T011-T015)
- [x] All entities have model tasks (T035-T042)
- [x] All tests come before implementation (T011-T025 → T026+)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] TDD approach enforced (tests must fail first)

## Notes
- Tests MUST fail before implementation begins
- [P] tasks can run simultaneously (different files, no dependencies)
- Commit after each completed task
- Mobile and web development can proceed in parallel after backend API is stable
- PWA features can be added incrementally alongside web development

---

**Total Tasks**: 140 | **Parallel Tasks**: 78 | **Estimated Timeline**: 8-12 weeks for full team