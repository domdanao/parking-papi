// IndexedDB wrapper for offline data storage
class OfflineStorage {
    constructor() {
        this.dbName = 'ParkingPlatformDB';
        this.dbVersion = 1;
        this.db = null;
    }

    // Initialize IndexedDB
    async init() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createObjectStores(db);
            };
        });
    }

    // Create object stores for different data types
    createObjectStores(db) {
        console.log('Creating IndexedDB object stores...');

        // Parking slots cache
        if (!db.objectStoreNames.contains('parkingSlots')) {
            const slotsStore = db.createObjectStore('parkingSlots', { keyPath: 'id' });
            slotsStore.createIndex('status', 'status', { unique: false });
            slotsStore.createIndex('location', ['latitude', 'longitude'], { unique: false });
            slotsStore.createIndex('cached_at', 'cached_at', { unique: false });
        }

        // User's parking sessions
        if (!db.objectStoreNames.contains('parkingSessions')) {
            const sessionsStore = db.createObjectStore('parkingSessions', { keyPath: 'id' });
            sessionsStore.createIndex('user_id', 'user_id', { unique: false });
            sessionsStore.createIndex('status', 'status', { unique: false });
            sessionsStore.createIndex('start_time', 'start_time', { unique: false });
        }

        // Favorite locations
        if (!db.objectStoreNames.contains('favoriteLocations')) {
            const favoritesStore = db.createObjectStore('favoriteLocations', { keyPath: 'id' });
            favoritesStore.createIndex('user_id', 'user_id', { unique: false });
            favoritesStore.createIndex('name', 'name', { unique: false });
        }

        // Pending sync queue
        if (!db.objectStoreNames.contains('pendingSync')) {
            const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
            syncStore.createIndex('type', 'type', { unique: false });
            syncStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // User profile cache
        if (!db.objectStoreNames.contains('userProfile')) {
            const profileStore = db.createObjectStore('userProfile', { keyPath: 'id' });
            profileStore.createIndex('cached_at', 'cached_at', { unique: false });
        }

        // Payment methods cache
        if (!db.objectStoreNames.contains('paymentMethods')) {
            const paymentsStore = db.createObjectStore('paymentMethods', { keyPath: 'id' });
            paymentsStore.createIndex('user_id', 'user_id', { unique: false });
            paymentsStore.createIndex('is_default', 'is_default', { unique: false });
        }
    }

    // Generic method to get all records from a store
    async getAll(storeName) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic method to get a record by ID
    async getById(storeName, id) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic method to put/update a record
    async put(storeName, data) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic method to delete a record
    async delete(storeName, id) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Clear all data from a store
    async clear(storeName) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Parking Slots specific methods
    async cacheParkingSlots(slots) {
        const cachedSlots = slots.map(slot => ({
            ...slot,
            cached_at: new Date().toISOString()
        }));

        const promises = cachedSlots.map(slot => this.put('parkingSlots', slot));
        return Promise.all(promises);
    }

    async getCachedParkingSlots(maxAge = 300000) { // 5 minutes default
        const allSlots = await this.getAll('parkingSlots');
        const cutoffTime = new Date(Date.now() - maxAge);

        return allSlots.filter(slot => {
            return new Date(slot.cached_at) > cutoffTime;
        });
    }

    async getNearbyParkingSlots(latitude, longitude, radius = 1000) {
        const allSlots = await this.getCachedParkingSlots();

        return allSlots.filter(slot => {
            const distance = this.calculateDistance(
                latitude, longitude,
                slot.latitude, slot.longitude
            );
            return distance <= radius;
        });
    }

    // User Sessions specific methods
    async cacheParkingSessions(sessions) {
        const promises = sessions.map(session => this.put('parkingSessions', session));
        return Promise.all(promises);
    }

    async getUserSessions(userId) {
        const allSessions = await this.getAll('parkingSessions');
        return allSessions.filter(session => session.user_id === userId);
    }

    async getActiveSessions(userId) {
        const sessions = await this.getUserSessions(userId);
        return sessions.filter(session => session.status === 'active');
    }

    // Favorite Locations methods
    async addFavoriteLocation(location) {
        return this.put('favoriteLocations', {
            ...location,
            id: location.id || Date.now().toString(),
            created_at: new Date().toISOString()
        });
    }

    async getFavoriteLocations(userId) {
        const allFavorites = await this.getAll('favoriteLocations');
        return allFavorites.filter(fav => fav.user_id === userId);
    }

    async removeFavoriteLocation(id) {
        return this.delete('favoriteLocations', id);
    }

    // User Profile methods
    async cacheUserProfile(profile) {
        return this.put('userProfile', {
            ...profile,
            cached_at: new Date().toISOString()
        });
    }

    async getCachedUserProfile(userId) {
        return this.getById('userProfile', userId);
    }

    // Payment Methods methods
    async cachePaymentMethods(paymentMethods) {
        const promises = paymentMethods.map(method => this.put('paymentMethods', method));
        return Promise.all(promises);
    }

    async getPaymentMethods(userId) {
        const allMethods = await this.getAll('paymentMethods');
        return allMethods.filter(method => method.user_id === userId);
    }

    // Pending Sync Queue methods
    async addToPendingSync(action) {
        return this.put('pendingSync', {
            ...action,
            created_at: new Date().toISOString(),
            attempts: 0
        });
    }

    async getPendingSync() {
        return this.getAll('pendingSync');
    }

    async removePendingSync(id) {
        return this.delete('pendingSync', id);
    }

    async incrementSyncAttempts(id) {
        const item = await this.getById('pendingSync', id);
        if (item) {
            item.attempts = (item.attempts || 0) + 1;
            item.last_attempt = new Date().toISOString();
            return this.put('pendingSync', item);
        }
    }

    // Utility methods
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    }

    // Clear old cached data
    async clearExpiredData() {
        const oneHourAgo = new Date(Date.now() - 3600000); // 1 hour

        // Clear old parking slots
        const oldSlots = await this.getAll('parkingSlots');
        for (const slot of oldSlots) {
            if (new Date(slot.cached_at) < oneHourAgo) {
                await this.delete('parkingSlots', slot.id);
            }
        }

        console.log('Cleared expired cached data');
    }

    // Get storage usage statistics
    async getStorageStats() {
        const stats = {};

        const stores = ['parkingSlots', 'parkingSessions', 'favoriteLocations',
                       'pendingSync', 'userProfile', 'paymentMethods'];

        for (const store of stores) {
            const data = await this.getAll(store);
            stats[store] = {
                count: data.length,
                size: JSON.stringify(data).length
            };
        }

        return stats;
    }
}

// Create and export singleton instance
const offlineStorage = new OfflineStorage();
export default offlineStorage;