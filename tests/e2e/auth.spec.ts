import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);

    // Fill login form
    await page.fill('[data-testid="email-input"]', 'vehicle.owner@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Submit login
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=Login');

    await page.fill('[data-testid="email-input"]', 'invalid@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL(/.*login/);
  });

  test('should register new user successfully', async ({ page }) => {
    await page.click('text=Register');
    await expect(page).toHaveURL(/.*register/);

    // Fill registration form
    await page.fill('[data-testid="first-name-input"]', 'New');
    await page.fill('[data-testid="last-name-input"]', 'User');
    await page.fill('[data-testid="email-input"]', 'new.user@test.com');
    await page.fill('[data-testid="mobile-number-input"]', '+639171234567');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="password-confirmation-input"]', 'password123');
    await page.selectOption('[data-testid="role-select"]', 'vehicle_owner');

    await page.click('[data-testid="register-button"]');

    // Should show verification message
    await expect(page.locator('text=Registration successful')).toBeVisible();
    await expect(page.locator('text=Please verify your email')).toBeVisible();
  });

  test('should validate required fields on registration', async ({ page }) => {
    await page.click('text=Register');

    // Try to submit empty form
    await page.click('[data-testid="register-button"]');

    // Should show validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'vehicle.owner@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Login')).toBeVisible();
  });

  test('should reset password successfully', async ({ page }) => {
    await page.click('text=Login');
    await page.click('text=Forgot Password?');

    await expect(page).toHaveURL(/.*forgot-password/);

    await page.fill('[data-testid="email-input"]', 'vehicle.owner@test.com');
    await page.click('[data-testid="send-reset-button"]');

    await expect(page.locator('text=Password reset link sent')).toBeVisible();
  });

  test('should require email verification for unverified users', async ({ page }) => {
    // Create unverified user and try to login
    await page.request.post('/api/test/create-unverified-user', {
      data: {
        email: 'unverified@test.com',
        password: 'password123',
      },
    });

    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'unverified@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('text=Please verify your email')).toBeVisible();
    await expect(page.locator('[data-testid="resend-verification-button"]')).toBeVisible();
  });

  test('should handle session timeout', async ({ page }) => {
    // Login
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'vehicle.owner@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Simulate session expiration
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('text=Session expired')).toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'vehicle.owner@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/parking-slots');

    // Should redirect to login with return URL
    await expect(page).toHaveURL(/.*login.*redirect/);

    // Login
    await page.fill('[data-testid="email-input"]', 'vehicle.owner@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Should redirect to original intended page
    await expect(page).toHaveURL(/.*parking-slots/);
  });
});