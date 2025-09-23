import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// Mock InertiaJS
global.route = jest.fn((name: string, params?: any) => {
  const routes: Record<string, string> = {
    'dashboard': '/dashboard',
    'parking-slots.index': '/parking-slots',
    'parking-slots.show': '/parking-slots/:id',
    'parking-slots.nearby': '/parking-slots/nearby',
    'qr.scan': '/qr/scan',
    'payments.wallet.balance': '/payments/wallet/balance',
    'auth.login': '/auth/login',
    'auth.register': '/auth/register',
  };

  let url = routes[name] || `/${name}`;

  if (params) {
    Object.keys(params).forEach(key => {
      url = url.replace(`:${key}`, params[key]);
    });
  }

  return url;
});

// Mock Laravel Echo
global.Echo = {
  channel: jest.fn(() => ({
    listen: jest.fn(),
    notification: jest.fn(),
    listenForWhisper: jest.fn(),
    whisper: jest.fn(),
  })),
  private: jest.fn(() => ({
    listen: jest.fn(),
    notification: jest.fn(),
    listenForWhisper: jest.fn(),
    whisper: jest.fn(),
  })),
  leave: jest.fn(),
  leaveChannel: jest.fn(),
  join: jest.fn(() => ({
    here: jest.fn(),
    joining: jest.fn(),
    leaving: jest.fn(),
    listen: jest.fn(),
    notification: jest.fn(),
    whisper: jest.fn(),
    listenForWhisper: jest.fn(),
  })),
};

// Mock location and geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: jest.fn(() => 'mocked-uuid'),
});

// Setup cleanup
afterEach(() => {
  jest.clearAllMocks();
});