import { test, expect } from '@playwright/test';

test.describe('Parking Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as vehicle owner
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'vehicle.owner@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should complete full parking booking flow', async ({ page }) => {
    // 1. Search for parking slots
    await page.click('[data-testid="search-parking-link"]');
    await expect(page).toHaveURL(/.*parking-slots/);

    // Use current location
    await page.click('[data-testid="use-current-location-button"]');

    // Grant geolocation permission
    await page.context().grantPermissions(['geolocation']);

    // Wait for slots to load
    await expect(page.locator('[data-testid="parking-slot-card"]')).toBeVisible();

    // 2. Select a parking slot
    const firstSlot = page.locator('[data-testid="parking-slot-card"]').first();
    await expect(firstSlot).toContainText('TEST001');
    await firstSlot.click();

    // Should navigate to slot details
    await expect(page).toHaveURL(/.*parking-slots\/.*$/);
    await expect(page.locator('h1')).toContainText('TEST001');

    // 3. Initiate QR scan
    await page.click('[data-testid="scan-qr-button"]');

    // Mock QR scan result
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('qr-scan-result', {
        detail: {
          qr_data: 'parking://slot/test-slot-id',
          location: { latitude: 14.5995, longitude: 120.9842 }
        }
      }));
    });

    // Should navigate to payment page
    await expect(page).toHaveURL(/.*payment/);
    await expect(page.locator('h1')).toContainText('Payment Details');

    // 4. Complete payment
    await expect(page.locator('[data-testid="slot-info"]')).toContainText('TEST001');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('₱100.00');

    // Select wallet payment
    await page.click('[data-testid="wallet-payment-option"]');
    await expect(page.locator('[data-testid="wallet-balance"]')).toBeVisible();

    // Confirm payment
    await page.click('[data-testid="pay-now-button"]');

    // 5. Payment success
    await expect(page.locator('text=Payment Successful')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-code"]')).toBeVisible();

    // 6. View active session
    await page.click('[data-testid="view-session-button"]');
    await expect(page).toHaveURL(/.*sessions\/.*$/);
    await expect(page.locator('text=Active Parking Session')).toBeVisible();
  });

  test('should handle QR scan error gracefully', async ({ page }) => {
    await page.goto('/parking-slots');

    // Click QR scan button
    await page.click('[data-testid="scan-qr-button"]');

    // Mock invalid QR scan
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('qr-scan-error', {
        detail: { error: 'Invalid QR code format' }
      }));
    });

    // Should show error message
    await expect(page.locator('text=Invalid QR code format')).toBeVisible();
    await expect(page.locator('[data-testid="retry-scan-button"]')).toBeVisible();
  });

  test('should handle insufficient wallet balance', async ({ page }) => {
    // Set low wallet balance
    await page.request.post('/api/test/set-wallet-balance', {
      data: { balance: 10.0 }
    });

    await page.goto('/parking-slots');

    const firstSlot = page.locator('[data-testid="parking-slot-card"]').first();
    await firstSlot.click();

    await page.click('[data-testid="scan-qr-button"]');

    // Mock QR scan
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('qr-scan-result', {
        detail: {
          qr_data: 'parking://slot/test-slot-id',
          location: { latitude: 14.5995, longitude: 120.9842 }
        }
      }));
    });

    await expect(page).toHaveURL(/.*payment/);

    // Wallet option should be disabled
    const walletOption = page.locator('[data-testid="wallet-payment-option"]');
    await expect(walletOption).toBeDisabled();
    await expect(page.locator('text=Insufficient balance')).toBeVisible();

    // Credit card should be selected by default
    const creditCardOption = page.locator('[data-testid="credit-card-payment-option"]');
    await expect(creditCardOption).toBeChecked();
  });

  test('should extend parking session', async ({ page }) => {
    // First create an active session
    await page.request.post('/api/test/create-active-session', {
      data: {
        slot_id: 'test-slot-id',
        user_id: 'test-user-id',
        duration: 120 // 2 hours
      }
    });

    // Navigate to sessions
    await page.goto('/sessions');
    await expect(page.locator('[data-testid="active-session-card"]')).toBeVisible();

    // Click on active session
    await page.click('[data-testid="active-session-card"]');

    // Should show session details
    await expect(page).toHaveURL(/.*sessions\/.*$/);
    await expect(page.locator('text=Active Parking Session')).toBeVisible();

    // Extend session
    await page.click('[data-testid="extend-session-button"]');
    await expect(page.locator('[data-testid="extend-session-modal"]')).toBeVisible();

    // Select extension duration
    await page.click('[data-testid="extend-1-hour-option"]');
    await expect(page.locator('text=Additional: ₱50.00')).toBeVisible();

    // Confirm extension
    await page.click('[data-testid="confirm-extension-button"]');

    // Should show success message
    await expect(page.locator('text=Session extended successfully')).toBeVisible();
    await expect(page.locator('[data-testid="updated-end-time"]')).toBeVisible();
  });

  test('should filter parking slots by criteria', async ({ page }) => {
    await page.goto('/parking-slots');

    // Open filters
    await page.click('[data-testid="filters-button"]');
    await expect(page.locator('[data-testid="filters-panel"]')).toBeVisible();

    // Set max price filter
    await page.fill('[data-testid="max-price-input"]', '60');

    // Select amenities
    await page.check('[data-testid="covered-amenity-checkbox"]');
    await page.check('[data-testid="secured-amenity-checkbox"]');

    // Apply filters
    await page.click('[data-testid="apply-filters-button"]');

    // Should update slot results
    await expect(page.locator('[data-testid="parking-slot-card"]')).toHaveCount(1);

    // Should only show TEST001 (₱50/hour with covered + secured)
    await expect(page.locator('[data-testid="parking-slot-card"]')).toContainText('TEST001');
  });

  test('should sort parking slots', async ({ page }) => {
    await page.goto('/parking-slots');

    // Wait for slots to load
    await expect(page.locator('[data-testid="parking-slot-card"]')).toHaveCount(2);

    // Sort by price (low to high)
    await page.selectOption('[data-testid="sort-select"]', 'price_low');

    // Should reorder slots
    const firstSlot = page.locator('[data-testid="parking-slot-card"]').first();
    await expect(firstSlot).toContainText('TEST001'); // ₱50/hour should be first
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/parking-slots');

    // Simulate network error
    await page.route('/api/parking-slots/nearby', route => {
      route.abort('failed');
    });

    await page.click('[data-testid="use-current-location-button"]');

    // Should show error message
    await expect(page.locator('text=Failed to load parking slots')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Clear network interception
    await page.unroute('/api/parking-slots/nearby');

    // Retry should work
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="parking-slot-card"]')).toBeVisible();
  });

  test('should show parking history', async ({ page }) => {
    // Create some test sessions
    await page.request.post('/api/test/create-session-history', {
      data: {
        sessions: [
          {
            slot_number: 'TEST001',
            start_time: '2024-01-01T10:00:00Z',
            end_time: '2024-01-01T12:00:00Z',
            total_amount: 100.0,
            status: 'completed'
          },
          {
            slot_number: 'TEST002',
            start_time: '2024-01-02T14:00:00Z',
            end_time: '2024-01-02T16:00:00Z',
            total_amount: 150.0,
            status: 'completed'
          }
        ]
      }
    });

    await page.goto('/sessions');

    // Switch to history tab
    await page.click('[data-testid="history-tab"]');

    // Should show completed sessions
    await expect(page.locator('[data-testid="session-history-item"]')).toHaveCount(2);
    await expect(page.locator('text=TEST001')).toBeVisible();
    await expect(page.locator('text=TEST002')).toBeVisible();
  });

  test('should handle real-time slot status updates', async ({ page }) => {
    await page.goto('/parking-slots');
    await expect(page.locator('[data-testid="parking-slot-card"]')).toHaveCount(2);

    // Mock real-time update
    await page.evaluate(() => {
      // Simulate WebSocket message
      window.dispatchEvent(new CustomEvent('slot-status-changed', {
        detail: {
          slot_id: 'test-slot-1',
          status: 'occupied'
        }
      }));
    });

    // Slot status should update
    const firstSlot = page.locator('[data-testid="parking-slot-card"]').first();
    await expect(firstSlot.locator('[data-testid="slot-status"]')).toContainText('Occupied');
  });

  test('should cancel parking session', async ({ page }) => {
    // Create active session
    await page.request.post('/api/test/create-active-session', {
      data: {
        slot_id: 'test-slot-id',
        user_id: 'test-user-id',
        duration: 120
      }
    });

    await page.goto('/sessions');
    await page.click('[data-testid="active-session-card"]');

    // Cancel session
    await page.click('[data-testid="cancel-session-button"]');

    // Confirm cancellation
    await expect(page.locator('[data-testid="cancel-confirmation-modal"]')).toBeVisible();
    await page.click('[data-testid="confirm-cancel-button"]');

    // Should show refund information
    await expect(page.locator('text=Session cancelled')).toBeVisible();
    await expect(page.locator('text=Refund processed')).toBeVisible();
  });
});