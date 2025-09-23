describe('Parking Flow E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete full parking workflow', async () => {
    // 1. Login
    await waitAndTap(by.id('login-button'));
    await waitAndType(by.id('email-input'), 'test@example.com');
    await waitAndType(by.id('password-input'), 'password123');
    await waitAndTap(by.id('submit-login-button'));

    // Wait for login to complete and navigate to main screen
    await waitForElement(by.id('main-screen'));

    // 2. Navigate to map screen
    await waitAndTap(by.id('map-tab'));
    await waitForElement(by.id('map-view'));

    // 3. Search for nearby parking slots
    await waitAndTap(by.id('location-button'));
    await waitForElement(by.id('slot-marker'));

    // 4. Select a parking slot
    await waitAndTap(by.id('slot-marker').atIndex(0));
    await waitForElement(by.id('slot-callout'));
    await waitAndTap(by.id('slot-callout'));

    // 5. View slot details
    await waitForElement(by.id('slot-details-screen'));
    await expect(element(by.text('A001'))).toBeVisible();
    await expect(element(by.text('₱50/hour'))).toBeVisible();

    // 6. Initiate QR scanning
    await waitAndTap(by.id('scan-qr-button'));
    await waitForElement(by.id('qr-scanner-screen'));

    // Grant camera permission if needed
    try {
      await waitAndTap(by.text('Allow'));
    } catch (e) {
      // Permission already granted
    }

    // 7. Mock QR scan result
    await device.sendUserNotification({
      payload: {
        qr_data: 'parking://slot/1',
        scan_result: 'success',
      },
    });

    // 8. Navigate to payment screen
    await waitForElement(by.id('payment-screen'));
    await expect(element(by.text('Payment Details'))).toBeVisible();

    // 9. Select payment method
    await waitAndTap(by.id('wallet-payment-option'));
    await expect(element(by.text('Available: ₱250.00'))).toBeVisible();

    // 10. Confirm payment
    await waitAndTap(by.id('pay-now-button'));
    await waitForElement(by.text('Processing...'));

    // 11. Payment success
    await waitForElement(by.id('payment-success-screen'));
    await expect(element(by.text('Payment Successful'))).toBeVisible();
    await expect(element(by.text('Confirmation Code'))).toBeVisible();

    // 12. Navigate to active session
    await waitAndTap(by.id('view-session-button'));
    await waitForElement(by.id('active-session-screen'));
    await expect(element(by.text('Active Parking Session'))).toBeVisible();
  });

  it('should handle QR scan failure gracefully', async () => {
    // Login first
    await waitAndTap(by.id('login-button'));
    await waitAndType(by.id('email-input'), 'test@example.com');
    await waitAndType(by.id('password-input'), 'password123');
    await waitAndTap(by.id('submit-login-button'));
    await waitForElement(by.id('main-screen'));

    // Navigate to QR scanner
    await waitAndTap(by.id('scan-tab'));
    await waitForElement(by.id('qr-scanner-screen'));

    // Mock invalid QR scan
    await device.sendUserNotification({
      payload: {
        qr_data: 'invalid-qr-data',
        scan_result: 'error',
      },
    });

    // Should show error message
    await waitForElement(by.text('Invalid QR code'));
    await expect(element(by.id('retry-scan-button'))).toBeVisible();

    // Retry scan
    await waitAndTap(by.id('retry-scan-button'));
    await waitForElement(by.id('qr-scanner-active'));
  });

  it('should handle insufficient wallet balance', async () => {
    // Login
    await waitAndTap(by.id('login-button'));
    await waitAndType(by.id('email-input'), 'lowbalance@example.com');
    await waitAndType(by.id('password-input'), 'password123');
    await waitAndTap(by.id('submit-login-button'));
    await waitForElement(by.id('main-screen'));

    // Navigate through parking flow to payment
    await waitAndTap(by.id('map-tab'));
    await waitAndTap(by.id('slot-marker').atIndex(0));
    await waitAndTap(by.id('slot-callout'));
    await waitAndTap(by.id('scan-qr-button'));

    // Mock QR scan
    await device.sendUserNotification({
      payload: {
        qr_data: 'parking://slot/1',
        scan_result: 'success',
      },
    });

    await waitForElement(by.id('payment-screen'));

    // Wallet should be disabled due to insufficient balance
    await expect(element(by.id('wallet-payment-option'))).not.toExist();
    await expect(element(by.text('Insufficient balance'))).toBeVisible();

    // Should default to credit card
    await expect(element(by.id('credit-card-payment-option'))).toBeVisible();
  });

  it('should extend parking session', async () => {
    // Login and start a parking session
    await waitAndTap(by.id('login-button'));
    await waitAndType(by.id('email-input'), 'test@example.com');
    await waitAndType(by.id('password-input'), 'password123');
    await waitAndTap(by.id('submit-login-button'));
    await waitForElement(by.id('main-screen'));

    // Navigate to active sessions (assuming user has one)
    await waitAndTap(by.id('sessions-tab'));
    await waitForElement(by.id('active-session-card'));
    await waitAndTap(by.id('active-session-card'));

    await waitForElement(by.id('session-details-screen'));

    // Extend session
    await waitAndTap(by.id('extend-session-button'));
    await waitForElement(by.id('extend-session-modal'));

    // Select extension duration
    await waitAndTap(by.id('extend-1-hour-button'));
    await expect(element(by.text('Additional: ₱50.00'))).toBeVisible();

    // Confirm extension
    await waitAndTap(by.id('confirm-extension-button'));
    await waitForElement(by.text('Session Extended'));

    // Should show updated end time
    await expect(element(by.id('updated-end-time'))).toBeVisible();
  });

  it('should handle network connectivity issues', async () => {
    // Login
    await waitAndTap(by.id('login-button'));
    await waitAndType(by.id('email-input'), 'test@example.com');
    await waitAndType(by.id('password-input'), 'password123');
    await waitAndTap(by.id('submit-login-button'));
    await waitForElement(by.id('main-screen'));

    // Simulate network disconnection
    await device.setNetworkConnection('none');

    // Try to search for slots
    await waitAndTap(by.id('map-tab'));
    await waitAndTap(by.id('location-button'));

    // Should show offline message
    await waitForElement(by.text('No internet connection'));
    await expect(element(by.id('offline-indicator'))).toBeVisible();

    // Restore network
    await device.setNetworkConnection('wifi');

    // Should automatically retry and load slots
    await waitForElement(by.id('slot-marker'));
  });

  it('should complete logout flow', async () => {
    // Login first
    await waitAndTap(by.id('login-button'));
    await waitAndType(by.id('email-input'), 'test@example.com');
    await waitAndType(by.id('password-input'), 'password123');
    await waitAndTap(by.id('submit-login-button'));
    await waitForElement(by.id('main-screen'));

    // Navigate to profile
    await waitAndTap(by.id('profile-tab'));
    await waitForElement(by.id('profile-screen'));

    // Scroll to logout button
    await element(by.id('profile-scroll-view')).scroll(200, 'down');
    await waitAndTap(by.id('logout-button'));

    // Confirm logout
    await waitForElement(by.text('Confirm Logout'));
    await waitAndTap(by.text('Logout'));

    // Should return to login screen
    await waitForElement(by.id('login-screen'));
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('should handle push notifications', async () => {
    // Login
    await waitAndTap(by.id('login-button'));
    await waitAndType(by.id('email-input'), 'test@example.com');
    await waitAndType(by.id('password-input'), 'password123');
    await waitAndTap(by.id('submit-login-button'));
    await waitForElement(by.id('main-screen'));

    // Send parking expiration warning notification
    await device.sendUserNotification({
      payload: {
        type: 'parking_expiration',
        message: 'Your parking session expires in 15 minutes',
        session_id: 'session_123',
      },
    });

    // Should show notification banner
    await waitForElement(by.text('Parking session expires in 15 minutes'));

    // Tap on notification to navigate to session
    await waitAndTap(by.id('notification-banner'));
    await waitForElement(by.id('session-details-screen'));
  });

  it('should support accessibility features', async () => {
    // Enable accessibility
    await device.setAccessibilityEnabled(true);

    // Login with accessibility labels
    await waitAndTap(by.label('Login button'));
    await waitAndType(by.label('Email input field'), 'test@example.com');
    await waitAndType(by.label('Password input field'), 'password123');
    await waitAndTap(by.label('Submit login'));

    await waitForElement(by.label('Main screen'));

    // Navigate using accessibility
    await waitAndTap(by.label('Map tab'));
    await waitForElement(by.label('Map view'));

    // Check for accessibility announcements
    await expect(element(by.label('Parking slots loaded'))).toBeVisible();
  });

  it('should handle app backgrounding and foregrounding', async () => {
    // Login
    await waitAndTap(by.id('login-button'));
    await waitAndType(by.id('email-input'), 'test@example.com');
    await waitAndType(by.id('password-input'), 'password123');
    await waitAndTap(by.id('submit-login-button'));
    await waitForElement(by.id('main-screen'));

    // Background the app
    await device.sendToHome();
    await sleep(2000);

    // Bring app back to foreground
    await device.launchApp({ newInstance: false });

    // Should maintain session state
    await waitForElement(by.id('main-screen'));
    await expect(element(by.text('Welcome back'))).toBeVisible();
  });
});