import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { router } from '@inertiajs/react';

// Mock Inertia page props
interface MockPageProps {
  auth?: {
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
      email_verified_at: string | null;
      mobile_verified_at: string | null;
    } | null;
  };
  flash?: {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
  };
  errors?: Record<string, string>;
  [key: string]: any;
}

// Default mock props
const defaultProps: MockPageProps = {
  auth: {
    user: {
      id: '1',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      role: 'vehicle_owner',
      email_verified_at: '2024-01-01T00:00:00Z',
      mobile_verified_at: '2024-01-01T00:00:00Z',
    },
  },
  flash: {},
  errors: {},
};

// Mock Inertia's usePage hook
const mockUsePage = (customProps: Partial<MockPageProps> = {}) => {
  const props = { ...defaultProps, ...customProps };

  jest.mock('@inertiajs/react', () => ({
    ...jest.requireActual('@inertiajs/react'),
    usePage: () => ({ props }),
    router: {
      visit: jest.fn(),
      reload: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
  }));

  return props;
};

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  pageProps?: Partial<MockPageProps>;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ children, pageProps = {} }) => {
  // Mock the page props
  mockUsePage(pageProps);

  return <>{children}</>;
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  pageProps?: Partial<MockPageProps>;
}

const customRender = (
  ui: ReactElement,
  { pageProps = {}, ...renderOptions }: CustomRenderOptions = {}
) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper pageProps={pageProps}>
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  });
};

// Mock API responses
export const mockApiResponse = {
  success: (data: any) => ({
    success: true,
    data,
    message: 'Operation successful',
  }),
  error: (message: string, errors: Record<string, string> = {}) => ({
    success: false,
    message,
    errors,
  }),
  paginated: (data: any[], currentPage = 1, total = data.length) => ({
    success: true,
    data: {
      data,
      current_page: currentPage,
      total,
      per_page: 15,
      last_page: Math.ceil(total / 15),
    },
  }),
};

// Mock geolocation
export const mockGeolocation = {
  getCurrentPosition: (successCallback: PositionCallback, errorCallback?: PositionErrorCallback) => {
    const position: GeolocationPosition = {
      coords: {
        latitude: 14.5995,
        longitude: 120.9842,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    setTimeout(() => successCallback(position), 100);
  },
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

// Mock fetch responses
export const mockFetch = {
  success: (data: any) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockApiResponse.success(data),
    });
  },
  error: (status = 400, message = 'Request failed') => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => mockApiResponse.error(message),
    });
  },
  networkError: () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
  },
};

// Test data factories
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: '1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  role: 'vehicle_owner',
  email_verified_at: '2024-01-01T00:00:00Z',
  mobile_verified_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockParkingSlot = (overrides: Partial<any> = {}) => ({
  id: '1',
  slot_number: 'A001',
  latitude: 14.5995,
  longitude: 120.9842,
  address: '123 Test Street, Manila',
  base_hourly_rate: 50.0,
  status: 'available',
  approval_status: 'published',
  amenities: ['covered', 'secured'],
  vehicle_compatibility: ['car', 'motorcycle'],
  distance_meters: 100,
  estimated_walk_time_minutes: 2,
  slot_owner: createMockUser({ role: 'slot_owner' }),
  ...overrides,
});

export const createMockParkingSession = (overrides: Partial<any> = {}) => ({
  id: '1',
  user_id: '1',
  parking_slot_id: '1',
  status: 'active',
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T12:00:00Z',
  total_amount: 100.0,
  confirmation_code: 'ABC123',
  parking_slot: createMockParkingSlot(),
  ...overrides,
});

export const createMockPaymentTransaction = (overrides: Partial<any> = {}) => ({
  id: '1',
  user_id: '1',
  session_id: '1',
  amount: 100.0,
  transaction_type: 'parking_payment',
  payment_method: 'wallet',
  status: 'completed',
  created_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

// Event helpers
export const mockQRScanResult = {
  scan_id: 'scan_123',
  session_token: 'session_token_123',
  slot_info: createMockParkingSlot(),
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  location: {
    latitude: 14.5995,
    longitude: 120.9842,
  },
};

// Component test helpers
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 100));

export const triggerResize = (width = 1024, height = 768) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };