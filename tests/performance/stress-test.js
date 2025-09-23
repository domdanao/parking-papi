import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const searchResponseTime = new Trend('search_response_time');
const qrScanErrors = new Counter('qr_scan_errors');
const concurrentBookings = new Counter('concurrent_bookings');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },

    // Stress phase
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },

    // Peak stress
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },

    // Ramp down
    { duration: '2m', target: 200 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.1'], // Error rate must be below 10%
    login_success_rate: ['rate>0.95'], // Login success rate must be above 95%
    search_response_time: ['p(90)<500'], // 90% of searches must complete below 500ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Test data
const users = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
];

const locations = [
  { latitude: 14.5995, longitude: 120.9842 },
  { latitude: 14.6005, longitude: 120.9852 },
  { latitude: 14.5985, longitude: 120.9832 },
];

export function setup() {
  // Create test users and slots
  console.log('Setting up test data...');

  const setupData = {
    users: [],
    slots: [],
  };

  // Create test users
  for (const user of users) {
    const response = http.post(`${BASE_URL}/api/test/create-user`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 201) {
      setupData.users.push(user);
    }
  }

  // Create test parking slots
  for (let i = 0; i < 20; i++) {
    const location = locations[i % locations.length];
    const slot = {
      slot_number: `STRESS${String(i + 1).padStart(3, '0')}`,
      latitude: location.latitude + (Math.random() - 0.5) * 0.01,
      longitude: location.longitude + (Math.random() - 0.5) * 0.01,
      address: `${i + 1} Stress Test Street, Manila`,
      base_hourly_rate: 40 + Math.random() * 60,
      status: 'available',
      approval_status: 'published',
    };

    const response = http.post(`${BASE_URL}/api/test/create-parking-slot`, JSON.stringify(slot), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 201) {
      setupData.slots.push(slot);
    }
  }

  console.log(`Setup completed: ${setupData.users.length} users, ${setupData.slots.length} slots`);
  return setupData;
}

export default function (data) {
  const user = users[Math.floor(Math.random() * users.length)];
  let authToken = '';

  group('Authentication Stress Test', () => {
    // Login
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });

    const loginSuccess = check(loginResponse, {
      'login successful': (r) => r.status === 200,
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });

    loginSuccessRate.add(loginSuccess);

    if (loginSuccess) {
      const loginData = JSON.parse(loginResponse.body);
      authToken = loginData.data.token;
    }
  });

  if (!authToken) {
    console.error('Failed to authenticate, skipping remaining tests');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  group('Parking Search Stress Test', () => {
    const location = locations[Math.floor(Math.random() * locations.length)];
    const searchParams = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius: '1000',
    });

    const searchResponse = http.get(`${BASE_URL}/api/parking-slots/nearby?${searchParams}`, {
      headers,
    });

    const searchTime = searchResponse.timings.duration;
    searchResponseTime.add(searchTime);

    check(searchResponse, {
      'search successful': (r) => r.status === 200,
      'search response time < 1000ms': (r) => r.timings.duration < 1000,
      'search returns slots': (r) => {
        const body = JSON.parse(r.body);
        return body.data && body.data.slots && body.data.slots.length > 0;
      },
    });
  });

  group('QR Scanning Stress Test', () => {
    const qrData = `parking://slot/stress-test-${Math.random().toString(36).substring(7)}`;
    const location = locations[Math.floor(Math.random() * locations.length)];

    const qrScanPayload = {
      qr_data: qrData,
      location,
    };

    const qrResponse = http.post(`${BASE_URL}/api/qr/scan`, JSON.stringify(qrScanPayload), {
      headers,
    });

    const qrSuccess = check(qrResponse, {
      'qr scan accepted': (r) => r.status === 202,
      'qr scan response time < 300ms': (r) => r.timings.duration < 300,
    });

    if (!qrSuccess) {
      qrScanErrors.add(1);
    }
  });

  group('Concurrent Booking Simulation', () => {
    // Simulate multiple users trying to book the same slot
    const slotId = `stress-slot-${Math.floor(Math.random() * 10) + 1}`;

    const bookingPayload = {
      session_token: `session_${Math.random().toString(36).substring(7)}`,
      duration_minutes: 120,
      payment_method: 'wallet',
    };

    const bookingResponse = http.post(`${BASE_URL}/api/qr/activate-payment`, JSON.stringify(bookingPayload), {
      headers,
    });

    const bookingResult = check(bookingResponse, {
      'booking processed': (r) => r.status === 201 || r.status === 400,
      'booking response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    if (bookingResponse.status === 201) {
      concurrentBookings.add(1);
    }
  });

  group('Analytics Load Test', () => {
    // Test analytics endpoints under load
    const analyticsResponse = http.get(`${BASE_URL}/api/analytics/slot-performance`, {
      headers,
    });

    check(analyticsResponse, {
      'analytics accessible': (r) => r.status === 200 || r.status === 403, // 403 if not slot owner
      'analytics response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });

  // Random sleep to simulate real user behavior
  sleep(Math.random() * 3 + 1);
}

export function teardown(data) {
  console.log('Cleaning up test data...');

  // Clean up test data
  const cleanupResponse = http.post(`${BASE_URL}/api/test/cleanup`, '', {
    headers: { 'Content-Type': 'application/json' },
  });

  if (cleanupResponse.status === 200) {
    console.log('Cleanup completed successfully');
  } else {
    console.warn('Cleanup failed or partially completed');
  }
}

export function handleSummary(data) {
  return {
    'test-results/stress-test-summary.json': JSON.stringify(data, null, 2),
    'test-results/stress-test-summary.html': htmlReport(data),
  };
}

function htmlReport(data) {
  const date = new Date().toISOString().split('T')[0];

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Stress Test Report - ${date}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
        .pass { border-left-color: #28a745; }
        .fail { border-left-color: #dc3545; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Parking Platform Stress Test Report</h1>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Test Duration:</strong> ${Math.round(data.state.testRunDurationMs / 1000)}s</p>

    <h2>Summary</h2>
    <div class="metric ${data.metrics.http_req_failed.values.rate < 0.1 ? 'pass' : 'fail'}">
        <strong>HTTP Request Failure Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
        (Threshold: < 10%)
    </div>

    <div class="metric ${data.metrics.http_req_duration.values['p(95)'] < 1000 ? 'pass' : 'fail'}">
        <strong>95th Percentile Response Time:</strong> ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
        (Threshold: < 1000ms)
    </div>

    <h2>Detailed Metrics</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Average</th>
            <th>95th Percentile</th>
            <th>Max</th>
        </tr>
        <tr>
            <td>HTTP Request Duration</td>
            <td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
            <td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
            <td>${data.metrics.http_req_duration.values.max.toFixed(2)}ms</td>
        </tr>
        <tr>
            <td>HTTP Requests</td>
            <td>${data.metrics.http_reqs.values.count} total</td>
            <td>${data.metrics.http_reqs.values.rate.toFixed(2)}/s</td>
            <td>-</td>
        </tr>
    </table>

    <h2>Test Phases</h2>
    <ul>
        <li>Ramp-up: 100 users over 2 minutes</li>
        <li>Normal Load: 100 users for 5 minutes</li>
        <li>Stress Load: 200 users for 7 minutes</li>
        <li>Peak Stress: 500 users for 7 minutes</li>
        <li>Ramp-down: 6 minutes total</li>
    </ul>
</body>
</html>
  `;
}