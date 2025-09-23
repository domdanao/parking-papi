const { cleanup, init } = require('detox');

beforeAll(async () => {
  await init();
});

afterAll(async () => {
  await cleanup();
});

// Global test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.waitForElement = async (matcher, timeout = 10000) => {
  await waitFor(element(matcher)).toBeVisible().withTimeout(timeout);
};

global.waitAndTap = async (matcher, timeout = 10000) => {
  await waitFor(element(matcher)).toBeVisible().withTimeout(timeout);
  await element(matcher).tap();
};

global.waitAndType = async (matcher, text, timeout = 10000) => {
  await waitFor(element(matcher)).toBeVisible().withTimeout(timeout);
  await element(matcher).typeText(text);
};

// Mock server setup for E2E tests
global.mockApiResponses = {
  login: {
    success: true,
    data: {
      user: {
        id: '1',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'vehicle_owner',
      },
      token: 'mock-auth-token',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  nearbySlots: {
    success: true,
    data: {
      slots: [
        {
          id: '1',
          slot_number: 'A001',
          latitude: 14.5995,
          longitude: 120.9842,
          base_hourly_rate: 50.0,
          status: 'available',
          distance_meters: 100,
        },
        {
          id: '2',
          slot_number: 'B002',
          latitude: 14.6005,
          longitude: 120.9852,
          base_hourly_rate: 60.0,
          status: 'occupied',
          distance_meters: 200,
        },
      ],
      total: 2,
      current_location: {
        latitude: 14.5995,
        longitude: 120.9842,
      },
    },
  },
  qrScan: {
    success: true,
    message: 'QR scan is being processed',
    data: {
      scan_id: 'scan_123',
    },
  },
  payment: {
    success: true,
    data: {
      transaction_id: 'txn_123',
      session_id: 'session_123',
      amount_paid: 100.0,
      remaining_balance: 150.0,
    },
  },
};