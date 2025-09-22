// Offline-aware API wrapper
import offlineStorage from './offline-storage.js';
import api from './api.js';

class OfflineAPI {
    constructor() {
        this.isOnline = navigator.onLine;
        this.setupConnectionListeners();
    }

    setupConnectionListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Generic offline-aware API method
    async makeRequest(endpoint, options = {}, cacheConfig = {}) {
        const {
            method = 'GET',
            data = null,
            useCache = true,
            maxAge = 300000, // 5 minutes
            syncWhenOnline = true
        } = { ...options, ...cacheConfig };

        // For read operations, try cache first when offline
        if (method === 'GET' && useCache && !this.isOnline) {
            const cachedData = await this.getCachedData(endpoint, maxAge);
            if (cachedData) {
                console.log(`[OfflineAPI] Serving ${endpoint} from cache`);
                return {
                    success: true,
                    data: cachedData,
                    fromCache: true
                };
            }
        }

        // Try network first
        if (this.isOnline) {
            try {
                const response = await api.request(endpoint, { method, data });

                // Cache successful responses for GET requests
                if (response.success && method === 'GET' && useCache) {
                    await this.cacheData(endpoint, response.data);
                }

                return response;
            } catch (error) {
                console.error(`[OfflineAPI] Network request failed for ${endpoint}:`, error);

                // Fall back to cache for GET requests
                if (method === 'GET' && useCache) {
                    const cachedData = await this.getCachedData(endpoint, maxAge);
                    if (cachedData) {
                        return {
                            success: true,
                            data: cachedData,
                            fromCache: true,
                            message: 'Showing cached data due to network error'
                        };
                    }
                }

                throw error;
            }
        }

        // We're offline - handle based on method
        if (method === 'GET') {
            // Try to serve from cache
            const cachedData = await this.getCachedData(endpoint, maxAge);
            if (cachedData) {
                return {
                    success: true,
                    data: cachedData,
                    fromCache: true,
                    message: 'Offline: showing cached data'
                };
            }

            throw new Error('No cached data available offline');
        } else {
            // Queue write operations for sync when online
            if (syncWhenOnline) {
                await this.queueForSync(endpoint, { method, data });
                return {
                    success: true,
                    message: 'Request queued for sync when online',
                    queued: true
                };
            }

            throw new Error('Cannot perform this action while offline');
        }
    }

    // Cache data with endpoint as key
    async cacheData(endpoint, data) {
        const cacheKey = this.getCacheKey(endpoint);
        const cacheData = {
            endpoint,
            data,
            cached_at: new Date().toISOString()
        };

        // Store in appropriate IndexedDB store based on endpoint
        const storeName = this.getStoreNameForEndpoint(endpoint);
        if (storeName === 'generic') {
            // For generic endpoints, create a cache entry
            await offlineStorage.put('apiCache', { id: cacheKey, ...cacheData });
        } else if (Array.isArray(data)) {
            // For array data, cache each item
            const promises = data.map(item => offlineStorage.put(storeName, item));
            await Promise.all(promises);
        } else {
            // For single items
            await offlineStorage.put(storeName, data);
        }
    }

    // Get cached data by endpoint
    async getCachedData(endpoint, maxAge) {
        const storeName = this.getStoreNameForEndpoint(endpoint);
        const cutoffTime = new Date(Date.now() - maxAge);

        try {
            if (storeName === 'generic') {
                const cacheKey = this.getCacheKey(endpoint);
                const cached = await offlineStorage.getById('apiCache', cacheKey);
                if (cached && new Date(cached.cached_at) > cutoffTime) {
                    return cached.data;
                }
            } else {
                // Get data from specific store
                const data = await offlineStorage.getAll(storeName);
                if (data.length > 0) {
                    // Check if any item is fresh enough
                    const freshData = data.filter(item => {
                        return item.cached_at && new Date(item.cached_at) > cutoffTime;
                    });
                    return freshData.length > 0 ? freshData : data;
                }
            }
        } catch (error) {
            console.error('[OfflineAPI] Error getting cached data:', error);
        }

        return null;
    }

    // Queue request for sync when online
    async queueForSync(endpoint, requestData) {
        await offlineStorage.addToPendingSync({
            endpoint,
            ...requestData,
            type: 'api_request'
        });
        console.log(`[OfflineAPI] Queued ${requestData.method} ${endpoint} for sync`);
    }

    // Sync pending data when back online
    async syncPendingData() {
        if (!this.isOnline) return;

        console.log('[OfflineAPI] Starting sync of pending data...');

        try {
            const pendingItems = await offlineStorage.getPendingSync();
            const apiRequests = pendingItems.filter(item => item.type === 'api_request');

            for (const item of apiRequests) {
                try {
                    await this.syncSingleItem(item);
                    await offlineStorage.removePendingSync(item.id);
                    console.log(`[OfflineAPI] Synced: ${item.method} ${item.endpoint}`);
                } catch (error) {
                    console.error(`[OfflineAPI] Failed to sync: ${item.endpoint}`, error);
                    await offlineStorage.incrementSyncAttempts(item.id);

                    // Remove after 3 failed attempts
                    if (item.attempts >= 3) {
                        await offlineStorage.removePendingSync(item.id);
                        console.log(`[OfflineAPI] Removed failed sync item after 3 attempts: ${item.endpoint}`);
                    }
                }
            }

            console.log('[OfflineAPI] Sync completed');
        } catch (error) {
            console.error('[OfflineAPI] Sync failed:', error);
        }
    }

    // Sync a single queued item
    async syncSingleItem(item) {
        return api.request(item.endpoint, {
            method: item.method,
            data: item.data
        });
    }

    // Get appropriate store name for endpoint
    getStoreNameForEndpoint(endpoint) {
        if (endpoint.includes('/parking-slots')) return 'parkingSlots';
        if (endpoint.includes('/sessions')) return 'parkingSessions';
        if (endpoint.includes('/favorites')) return 'favoriteLocations';
        if (endpoint.includes('/auth/user')) return 'userProfile';
        if (endpoint.includes('/payment-methods')) return 'paymentMethods';
        return 'generic';
    }

    // Generate cache key for endpoint
    getCacheKey(endpoint) {
        return btoa(endpoint).replace(/[^a-zA-Z0-9]/g, '');
    }

    // Parking-specific methods
    async searchNearbySlots(params) {
        const endpoint = '/api/parking-slots/nearby';
        const queryString = new URLSearchParams(params).toString();
        const fullEndpoint = `${endpoint}?${queryString}`;

        try {
            const response = await this.makeRequest(fullEndpoint, {
                method: 'GET',
                useCache: true,
                maxAge: 300000 // 5 minutes
            });

            // Also cache individual slots
            if (response.success && response.data.slots) {
                await offlineStorage.cacheParkingSlots(response.data.slots);
            }

            return response;
        } catch (error) {
            // If network fails, try to get nearby slots from cache
            if (params.latitude && params.longitude) {
                const cachedSlots = await offlineStorage.getNearbyParkingSlots(
                    params.latitude,
                    params.longitude,
                    params.radius || 1000
                );

                if (cachedSlots.length > 0) {
                    return {
                        success: true,
                        data: { slots: cachedSlots },
                        fromCache: true,
                        message: 'Showing nearby slots from cache'
                    };
                }
            }

            throw error;
        }
    }

    async getUserSessions() {
        try {
            const response = await this.makeRequest('/api/sessions', {
                method: 'GET',
                useCache: true,
                maxAge: 60000 // 1 minute
            });

            // Cache sessions
            if (response.success && response.data) {
                await offlineStorage.cacheParkingSessions(response.data);
            }

            return response;
        } catch (error) {
            // Return cached sessions if available
            const user = await this.getCurrentUser();
            if (user && user.data) {
                const cachedSessions = await offlineStorage.getUserSessions(user.data.id);
                if (cachedSessions.length > 0) {
                    return {
                        success: true,
                        data: cachedSessions,
                        fromCache: true,
                        message: 'Showing sessions from cache'
                    };
                }
            }

            throw error;
        }
    }

    async getCurrentUser() {
        return this.makeRequest('/api/auth/user', {
            method: 'GET',
            useCache: true,
            maxAge: 600000 // 10 minutes
        });
    }

    async getPaymentMethods() {
        return this.makeRequest('/api/payment-methods', {
            method: 'GET',
            useCache: true,
            maxAge: 3600000 // 1 hour
        });
    }

    // Write operations that queue when offline
    async createParkingSession(data) {
        return this.makeRequest('/api/sessions', {
            method: 'POST',
            data,
            syncWhenOnline: true
        });
    }

    async updateSession(sessionId, data) {
        return this.makeRequest(`/api/sessions/${sessionId}`, {
            method: 'PUT',
            data,
            syncWhenOnline: true
        });
    }

    async addFavoriteLocation(data) {
        // Optimistically add to cache
        await offlineStorage.addFavoriteLocation(data);

        return this.makeRequest('/api/favorites', {
            method: 'POST',
            data,
            syncWhenOnline: true
        });
    }

    // Clear all cached data
    async clearAllCache() {
        const stores = ['parkingSlots', 'parkingSessions', 'favoriteLocations',
                       'userProfile', 'paymentMethods', 'apiCache'];

        for (const store of stores) {
            try {
                await offlineStorage.clear(store);
            } catch (error) {
                console.error(`Failed to clear ${store}:`, error);
            }
        }

        console.log('[OfflineAPI] All cached data cleared');
    }

    // Get sync queue status
    async getSyncStatus() {
        const pendingItems = await offlineStorage.getPendingSync();
        const apiRequests = pendingItems.filter(item => item.type === 'api_request');

        return {
            isOnline: this.isOnline,
            pendingCount: apiRequests.length,
            pendingItems: apiRequests
        };
    }
}

// Create and export singleton instance
const offlineAPI = new OfflineAPI();
export default offlineAPI;