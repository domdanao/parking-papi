import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log('Cleaning up E2E test environment...');

  // Launch browser for cleanup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseURL!);

    // Clean up test data
    await cleanupTestData(page);

    console.log('E2E test environment cleanup completed');
  } catch (error) {
    console.error('Failed to clean up E2E test environment:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function cleanupTestData(page: any) {
  const response = await page.request.post('/api/test/cleanup', {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    console.warn(`Failed to cleanup test data: ${response.status()}`);
  }
}

export default globalTeardown;