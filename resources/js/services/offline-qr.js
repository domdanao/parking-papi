// Offline QR Code Scanning and Management
import offlineStorage from './offline-storage.js';
import offlineAPI from './offline-api.js';

class OfflineQRService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.setupConnectionListeners();
    }

    setupConnectionListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingQRScans();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Process QR code scan with offline support
    async processQRScan(qrData, location) {
        console.log('[OfflineQR] Processing QR scan:', qrData);

        // Try to extract slot information from QR code
        const qrInfo = this.parseQRCode(qrData);
        if (!qrInfo.isValid) {
            throw new Error('Invalid QR code format');
        }

        // If online, process normally
        if (this.isOnline) {
            try {
                return await this.processOnlineQRScan(qrData, location);
            } catch (error) {
                console.warn('[OfflineQR] Online processing failed, trying offline:', error);
                return await this.processOfflineQRScan(qrInfo, location);
            }
        }

        // Process offline
        return await this.processOfflineQRScan(qrInfo, location);
    }

    // Process QR scan online
    async processOnlineQRScan(qrData, location) {
        const response = await offlineAPI.makeRequest('/api/qr/scan', {
            method: 'POST',
            data: {
                qr_data: qrData,
                location: {
                    ...location,
                    accuracy: location.accuracy || 10.0
                },
                scan_timestamp: new Date().toISOString()
            }
        });

        // Cache the scan result for offline use
        if (response.success && response.data) {
            await this.cacheQRScanResult(qrData, response.data);
        }

        return response;
    }

    // Process QR scan offline
    async processOfflineQRScan(qrInfo, location) {
        console.log('[OfflineQR] Processing QR scan offline');

        // Try to get cached slot information
        const cachedSlot = await this.getCachedSlotInfo(qrInfo.slotId);
        if (!cachedSlot) {
            throw new Error('Slot information not available offline. Please connect to internet.');
        }

        // Check if slot is available (based on cached data)
        if (cachedSlot.status !== 'available') {
            throw new Error(`Slot is currently ${cachedSlot.status}. Cannot book offline.`);
        }

        // Create offline scan result
        const offlineScanResult = {
            scan_id: this.generateOfflineScanId(),
            session_token: this.generateSessionToken(),
            slot_info: {
                id: cachedSlot.id,
                slot_number: cachedSlot.slot_number,
                hourly_rate: cachedSlot.base_hourly_rate,
                status: cachedSlot.status
            },
            expires_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes
            offline: true,
            location: location
        };

        // Store for sync when online
        await this.storeOfflineScan({
            scan_id: offlineScanResult.scan_id,
            qr_data: qrInfo.originalData,
            location: location,
            scan_timestamp: new Date().toISOString(),
            slot_id: cachedSlot.id
        });

        return {
            success: true,
            data: offlineScanResult,
            message: 'QR scanned offline. Booking will sync when online.'
        };
    }

    // Parse QR code data
    parseQRCode(qrData) {
        try {
            // Expected format: parking://slot/{slot_id}?location={lat},{lng}&timestamp={ts}
            // Or JSON format: {"type":"parking_slot","slot_id":"...","location":{...}}

            let slotId, isValid = false, originalData = qrData;

            // Try JSON format first
            if (qrData.startsWith('{')) {
                const parsed = JSON.parse(qrData);
                if (parsed.type === 'parking_slot' && parsed.slot_id) {
                    slotId = parsed.slot_id;
                    isValid = true;
                }
            }
            // Try URL format
            else if (qrData.startsWith('parking://')) {
                const url = new URL(qrData);
                const pathParts = url.pathname.split('/');
                if (pathParts[1] === 'slot' && pathParts[2]) {
                    slotId = pathParts[2];
                    isValid = true;
                }
            }
            // Try simple slot ID format
            else if (/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(qrData)) {
                slotId = qrData;
                isValid = true;
            }

            return {
                isValid,
                slotId,
                originalData
            };
        } catch (error) {
            console.error('[OfflineQR] Error parsing QR code:', error);
            return { isValid: false, originalData: qrData };
        }
    }

    // Get cached slot information
    async getCachedSlotInfo(slotId) {
        try {
            return await offlineStorage.getById('parkingSlots', slotId);
        } catch (error) {
            console.error('[OfflineQR] Error getting cached slot info:', error);
            return null;
        }
    }

    // Cache QR scan result
    async cacheQRScanResult(qrData, scanResult) {
        try {
            await offlineStorage.put('qrScanResults', {
                id: scanResult.scan_id,
                qr_data: qrData,
                result: scanResult,
                cached_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('[OfflineQR] Error caching scan result:', error);
        }
    }

    // Store offline scan for sync
    async storeOfflineScan(scanData) {
        await offlineStorage.addToPendingSync({
            type: 'qr_scan',
            endpoint: '/api/qr/scan',
            method: 'POST',
            data: scanData,
            offline_generated: true
        });
    }

    // Process offline booking
    async processOfflineBooking(scanResult, duration, paymentMethod) {
        console.log('[OfflineQR] Processing offline booking');

        if (!scanResult.offline) {
            // If not offline scan, process normally
            return await offlineAPI.makeRequest('/api/qr/activate-payment', {
                method: 'POST',
                data: {
                    scan_id: scanResult.scan_id,
                    session_token: scanResult.session_token,
                    duration_minutes: duration,
                    payment_method: { type: paymentMethod }
                }
            });
        }

        // Create offline booking
        const offlineBooking = {
            id: this.generateOfflineBookingId(),
            scan_id: scanResult.scan_id,
            session_token: scanResult.session_token,
            slot_id: scanResult.slot_info.id,
            duration_minutes: duration,
            payment_method: paymentMethod,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + (duration * 60000)).toISOString(),
            hourly_rate: scanResult.slot_info.hourly_rate,
            total_amount: (duration / 60) * scanResult.slot_info.hourly_rate,
            status: 'pending_sync',
            offline: true,
            confirmation_code: this.generateConfirmationCode()
        };

        // Store offline booking
        await offlineStorage.put('parkingSessions', offlineBooking);

        // Queue for sync
        await offlineStorage.addToPendingSync({
            type: 'booking_activation',
            endpoint: '/api/qr/activate-payment',
            method: 'POST',
            data: {
                scan_id: scanResult.scan_id,
                session_token: scanResult.session_token,
                duration_minutes: duration,
                payment_method: { type: paymentMethod }
            },
            offline_booking_id: offlineBooking.id
        });

        return {
            success: true,
            data: offlineBooking,
            message: 'Booking created offline. Will sync when online.',
            offline: true
        };
    }

    // Sync pending QR scans when back online
    async syncPendingQRScans() {
        if (!this.isOnline) return;

        console.log('[OfflineQR] Syncing pending QR operations...');

        try {
            const pendingItems = await offlineStorage.getPendingSync();
            const qrItems = pendingItems.filter(item =>
                item.type === 'qr_scan' || item.type === 'booking_activation'
            );

            for (const item of qrItems) {
                try {
                    await this.syncQRItem(item);
                    await offlineStorage.removePendingSync(item.id);
                    console.log(`[OfflineQR] Synced: ${item.type}`);
                } catch (error) {
                    console.error(`[OfflineQR] Failed to sync ${item.type}:`, error);
                    await offlineStorage.incrementSyncAttempts(item.id);

                    // Remove after 3 failed attempts
                    if (item.attempts >= 3) {
                        await offlineStorage.removePendingSync(item.id);
                        await this.handleFailedSync(item);
                    }
                }
            }
        } catch (error) {
            console.error('[OfflineQR] QR sync failed:', error);
        }
    }

    // Sync individual QR item
    async syncQRItem(item) {
        if (item.type === 'qr_scan') {
            return await offlineAPI.makeRequest(item.endpoint, {
                method: item.method,
                data: item.data
            });
        } else if (item.type === 'booking_activation') {
            const response = await offlineAPI.makeRequest(item.endpoint, {
                method: item.method,
                data: item.data
            });

            // Update local offline booking with server response
            if (response.success && item.offline_booking_id) {
                await this.updateOfflineBooking(item.offline_booking_id, response.data);
            }

            return response;
        }
    }

    // Update offline booking with server data
    async updateOfflineBooking(offlineBookingId, serverData) {
        try {
            const offlineBooking = await offlineStorage.getById('parkingSessions', offlineBookingId);
            if (offlineBooking) {
                const updatedBooking = {
                    ...offlineBooking,
                    ...serverData,
                    offline: false,
                    synced_at: new Date().toISOString()
                };

                await offlineStorage.put('parkingSessions', updatedBooking);
                console.log('[OfflineQR] Updated offline booking with server data');
            }
        } catch (error) {
            console.error('[OfflineQR] Error updating offline booking:', error);
        }
    }

    // Handle failed sync
    async handleFailedSync(item) {
        console.log(`[OfflineQR] Handling failed sync for ${item.type}`);

        if (item.type === 'booking_activation' && item.offline_booking_id) {
            // Mark offline booking as failed
            const booking = await offlineStorage.getById('parkingSessions', item.offline_booking_id);
            if (booking) {
                booking.status = 'sync_failed';
                booking.sync_error = 'Failed to sync with server after 3 attempts';
                await offlineStorage.put('parkingSessions', booking);
            }
        }
    }

    // Generate offline scan ID
    generateOfflineScanId() {
        return 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Generate session token
    generateSessionToken() {
        return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Generate offline booking ID
    generateOfflineBookingId() {
        return 'offline_booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Generate confirmation code
    generateConfirmationCode() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    // Get offline bookings
    async getOfflineBookings() {
        const allSessions = await offlineStorage.getAll('parkingSessions');
        return allSessions.filter(session => session.offline === true);
    }

    // Clear expired offline scans
    async clearExpiredScans() {
        try {
            const allScans = await offlineStorage.getAll('qrScanResults');
            const oneDayAgo = new Date(Date.now() - 86400000); // 24 hours

            for (const scan of allScans) {
                if (new Date(scan.cached_at) < oneDayAgo) {
                    await offlineStorage.delete('qrScanResults', scan.id);
                }
            }

            console.log('[OfflineQR] Cleared expired scan results');
        } catch (error) {
            console.error('[OfflineQR] Error clearing expired scans:', error);
        }
    }

    // Get QR service status
    async getStatus() {
        const offlineBookings = await this.getOfflineBookings();
        const pendingItems = await offlineStorage.getPendingSync();
        const qrPending = pendingItems.filter(item =>
            item.type === 'qr_scan' || item.type === 'booking_activation'
        );

        return {
            isOnline: this.isOnline,
            offlineBookings: offlineBookings.length,
            pendingSync: qrPending.length,
            canScanOffline: true
        };
    }
}

// Create and export singleton instance
const offlineQRService = new OfflineQRService();
export default offlineQRService;