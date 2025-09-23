import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Setting up E2E test environment...');

  try {
    // Wait for the application to be ready
    await page.goto(baseURL!);
    await page.waitForSelector('body', { timeout: 30000 });

    // Set up test database
    await setupTestDatabase(page);

    // Create test users
    await createTestUsers(page);

    // Set up test parking slots
    await setupTestParkingSlots(page);

    console.log('E2E test environment setup completed');
  } catch (error) {
    console.error('Failed to set up E2E test environment:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestDatabase(page: any) {
  // Make API call to reset test database
  const response = await page.request.post('/api/test/reset-database', {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to reset test database: ${response.status()}`);
  }
}

async function createTestUsers(page: any) {
  const testUsers = [
    {
      first_name: 'Vehicle',
      last_name: 'Owner',
      email: 'vehicle.owner@test.com',
      password: 'password123',
      role: 'vehicle_owner',
      email_verified_at: new Date().toISOString(),
      mobile_verified_at: new Date().toISOString(),
    },
    {
      first_name: 'Slot',
      last_name: 'Owner',
      email: 'slot.owner@test.com',
      password: 'password123',
      role: 'slot_owner',
      email_verified_at: new Date().toISOString(),
      mobile_verified_at: new Date().toISOString(),
    },
    {
      first_name: 'Platform',
      last_name: 'Owner',
      email: 'platform.owner@test.com',
      password: 'password123',
      role: 'platform_owner',
      email_verified_at: new Date().toISOString(),
      mobile_verified_at: new Date().toISOString(),
    },
  ];

  for (const user of testUsers) {
    const response = await page.request.post('/api/test/create-user', {
      data: user,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test user ${user.email}: ${response.status()}`);
    }
  }
}

async function setupTestParkingSlots(page: any) {
  const testSlots = [
    {
      slot_number: 'TEST001',
      latitude: 14.5995,
      longitude: 120.9842,
      address: '123 Test Street, Manila',
      base_hourly_rate: 50.0,
      status: 'available',
      approval_status: 'published',
      amenities: ['covered', 'secured'],
      vehicle_compatibility: ['car', 'motorcycle'],
    },
    {
      slot_number: 'TEST002',
      latitude: 14.6005,
      longitude: 120.9852,
      address: '456 Test Avenue, Manila',
      base_hourly_rate: 75.0,
      status: 'available',
      approval_status: 'published',
      amenities: ['covered', 'ev_charging'],
      vehicle_compatibility: ['car'],
    },
    {
      slot_number: 'TEST003',
      latitude: 14.5985,
      longitude: 120.9832,
      address: '789 Test Road, Manila',
      base_hourly_rate: 40.0,
      status: 'maintenance',
      approval_status: 'published',
      amenities: ['secured'],
      vehicle_compatibility: ['car', 'motorcycle'],
    },
  ];

  for (const slot of testSlots) {
    const response = await page.request.post('/api/test/create-parking-slot', {
      data: slot,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test parking slot ${slot.slot_number}: ${response.status()}`);
    }
  }
}

export default globalSetup;