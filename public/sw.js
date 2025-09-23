// Service Worker for Parking Platform PWA
const CACHE_NAME = 'parking-papi-v5';
const STATIC_CACHE_NAME = 'parking-papi-static-v5';
const DYNAMIC_CACHE_NAME = 'parking-papi-dynamic-v5';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/offline.html'
  // Note: Build assets are dynamically cached in fetch handler
  // to handle Vite's hash-based filenames in development
];

// API endpoints that can be cached
const CACHEABLE_API_ROUTES = [
  '/api/parking-slots/nearby',
  '/api/auth/user',
  '/api/payment-methods'
];

// Check if we're in development mode
function isDevelopment() {
  return self.location.hostname === 'localhost' ||
         self.location.hostname === '127.0.0.1' ||
         self.location.hostname.endsWith('.test') ||
         self.location.port === '5173'; // Vite dev server port
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // If successful and cacheable, update cache
    if (networkResponse.ok && isCacheableApiRoute(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', url.pathname);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving API response from cache');
      return cachedResponse;
    }

    // If it's a critical API request, return offline response
    if (isCriticalApiRoute(url.pathname)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'You are currently offline. Please check your connection.',
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw error;
  }
}

// Handle navigation requests with cache-first for app shell
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);

    // Only cache navigation responses in production (not during development)
    if (!isDevelopment()) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache');

    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to offline page
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }

    // Last resort fallback
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Handle static assets with smart caching strategy
async function handleStaticRequest(request) {
  const url = new URL(request.url);

  // For build assets (JS/CSS), use network-first in development to prevent stale cache
  const isBuildAsset = url.pathname.includes('/build/assets/');

  if (isBuildAsset) {
    try {
      // Try network first for build assets
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('[SW] Network failed for build asset, trying cache:', request.url);
    }

    // Fall back to cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw new Error('Build asset not available');
  }

  // For other static assets, use cache-first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Check if API route is cacheable
function isCacheableApiRoute(pathname) {
  return CACHEABLE_API_ROUTES.some(route => pathname.startsWith(route));
}

// Check if API route is critical (needs offline response)
function isCriticalApiRoute(pathname) {
  const criticalRoutes = [
    '/api/auth/user',
    '/api/parking-slots/nearby',
    '/api/payment-methods'
  ];
  return criticalRoutes.some(route => pathname.startsWith(route));
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-parking') {
    event.waitUntil(syncPendingParkingData());
  }
});

// Sync pending parking data when connection is restored
async function syncPendingParkingData() {
  try {
    console.log('[SW] Starting background sync for parking data');

    // Get pending data from IndexedDB
    const pendingData = await getPendingData();

    for (const item of pendingData) {
      try {
        await syncDataItem(item);
        await removePendingData(item.id);
        console.log('[SW] Synced data item:', item.id);
      } catch (error) {
        console.error('[SW] Failed to sync data item:', item.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations (simplified)
async function getPendingData() {
  // This would interface with IndexedDB to get pending sync data
  // For now, return empty array as placeholder
  return [];
}

async function syncDataItem(item) {
  // Sync individual data item to server
  const response = await fetch(item.endpoint, {
    method: item.method,
    headers: item.headers,
    body: item.body
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }

  return response;
}

async function removePendingData(id) {
  // Remove item from pending sync queue in IndexedDB
  console.log('[SW] Removing synced data item:', id);
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'Parking Notification',
    body: 'You have a parking-related update',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'parking-notification'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker script loaded');