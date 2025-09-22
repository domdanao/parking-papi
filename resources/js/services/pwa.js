// PWA Service Worker Registration and Management
class PWAService {
    constructor() {
        this.swRegistration = null;
        this.isOnline = navigator.onLine;
        this.installPrompt = null;
        this.isInstalled = false;

        this.init();
    }

    async init() {
        // Check if we're running as installed PWA
        this.checkInstallationStatus();

        // Register service worker
        await this.registerServiceWorker();

        // Set up online/offline event listeners
        this.setupConnectionListeners();

        // Set up install prompt handling
        this.setupInstallPrompt();

        // Set up periodic sync
        this.setupPeriodicSync();

        console.log('PWA Service initialized');
    }

    // Check if app is installed as PWA
    checkInstallationStatus() {
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone ||
                          document.referrer.includes('android-app://');

        if (this.isInstalled) {
            console.log('App is running as installed PWA');
            document.body.classList.add('pwa-installed');
        }
    }

    // Register the service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                console.log('Service Worker registered successfully');

                // Handle service worker updates
                this.swRegistration.addEventListener('updatefound', () => {
                    const newWorker = this.swRegistration.installing;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateAvailable();
                        }
                    });
                });

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event);
                });

            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        } else {
            console.warn('Service Workers not supported');
        }
    }

    // Handle messages from service worker
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'CACHE_UPDATED':
                console.log('Cache updated:', data);
                break;
            case 'BACKGROUND_SYNC_SUCCESS':
                this.showNotification('Data synced successfully', 'success');
                break;
            case 'BACKGROUND_SYNC_FAILED':
                this.showNotification('Failed to sync data', 'error');
                break;
            default:
                console.log('Unknown message from service worker:', event.data);
        }
    }

    // Set up online/offline connection listeners
    setupConnectionListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.onConnectionChange(true);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.onConnectionChange(false);
        });
    }

    // Handle connection status changes
    onConnectionChange(isOnline) {
        const statusEl = document.getElementById('connection-status');

        if (isOnline) {
            console.log('App is back online');
            this.showNotification('Back online! Syncing data...', 'success', 3000);

            // Trigger background sync
            this.requestBackgroundSync();

            // Update UI
            document.body.classList.remove('offline');
            if (statusEl) statusEl.style.display = 'none';

        } else {
            console.log('App is offline');
            this.showNotification('You are offline. Some features may be limited.', 'warning', 5000);

            // Update UI
            document.body.classList.add('offline');
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.textContent = 'Offline mode';
            }
        }
    }

    // Set up install prompt handling
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;

            // Show install button or banner
            this.showInstallPromotion();
        });

        // Handle successful installation
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.installPrompt = null;
            this.isInstalled = true;
            this.hideInstallPromotion();
            this.showNotification('App installed successfully!', 'success');
        });
    }

    // Show install promotion to user
    showInstallPromotion() {
        const installBanner = document.createElement('div');
        installBanner.id = 'install-banner';
        installBanner.className = 'install-banner';
        installBanner.innerHTML = `
            <div class="install-content">
                <span>📱 Install Parking Platform for a better experience</span>
                <div class="install-actions">
                    <button id="install-button" class="btn btn-primary btn-sm">Install</button>
                    <button id="dismiss-install" class="btn btn-secondary btn-sm">Not now</button>
                </div>
            </div>
        `;

        document.body.appendChild(installBanner);

        // Add event listeners
        document.getElementById('install-button').addEventListener('click', () => {
            this.promptInstall();
        });

        document.getElementById('dismiss-install').addEventListener('click', () => {
            this.hideInstallPromotion();
        });
    }

    // Hide install promotion
    hideInstallPromotion() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.remove();
        }
    }

    // Prompt user to install PWA
    async promptInstall() {
        if (!this.installPrompt) {
            console.log('Install prompt not available');
            return;
        }

        try {
            this.installPrompt.prompt();
            const result = await this.installPrompt.userChoice;

            if (result.outcome === 'accepted') {
                console.log('User accepted install prompt');
            } else {
                console.log('User dismissed install prompt');
            }

            this.installPrompt = null;
            this.hideInstallPromotion();

        } catch (error) {
            console.error('Error prompting install:', error);
        }
    }

    // Set up periodic background sync
    setupPeriodicSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            // Request background sync when app regains focus
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.isOnline) {
                    this.requestBackgroundSync();
                }
            });
        }
    }

    // Request background sync from service worker
    async requestBackgroundSync() {
        if (this.swRegistration && this.swRegistration.sync) {
            try {
                await this.swRegistration.sync.register('background-sync-parking');
                console.log('Background sync requested');
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        }
    }

    // Show update available notification
    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.id = 'update-banner';
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span>🔄 A new version is available</span>
                <button id="update-button" class="btn btn-primary btn-sm">Update</button>
            </div>
        `;

        document.body.appendChild(updateBanner);

        document.getElementById('update-button').addEventListener('click', () => {
            this.applyUpdate();
        });
    }

    // Apply service worker update
    async applyUpdate() {
        if (this.swRegistration && this.swRegistration.waiting) {
            this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

            // Reload page to activate new service worker
            window.location.reload();
        }
    }

    // Show notification to user
    showNotification(message, type = 'info', duration = 4000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        const container = document.getElementById('notifications') || document.body;
        container.appendChild(notification);

        // Add event listeners
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    // Get app installation status
    getInstallationStatus() {
        return {
            isInstalled: this.isInstalled,
            canInstall: !!this.installPrompt,
            isOnline: this.isOnline
        };
    }

    // Cache important data for offline use
    async cacheImportantData(data) {
        if (this.swRegistration) {
            this.swRegistration.active?.postMessage({
                type: 'CACHE_IMPORTANT_DATA',
                data: data
            });
        }
    }

    // Clear all cached data
    async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('All caches cleared');
        }
    }

    // Get cache storage estimate
    async getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            return await navigator.storage.estimate();
        }
        return null;
    }
}

// Initialize PWA service
const pwaService = new PWAService();

export default pwaService;