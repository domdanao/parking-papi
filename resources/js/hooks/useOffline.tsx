import { useState, useEffect, useCallback } from 'react';

// Offline status hook
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

// PWA installation hook
export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        const checkInstalled = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone ||
                               document.referrer.includes('android-app://');
            setIsInstalled(isStandalone);
        };

        checkInstalled();

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        // Listen for successful install
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return false;

        try {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;

            setDeferredPrompt(null);
            setIsInstallable(false);

            return result.outcome === 'accepted';
        } catch (error) {
            console.error('Install prompt failed:', error);
            return false;
        }
    }, [deferredPrompt]);

    return {
        isInstallable,
        isInstalled,
        promptInstall
    };
}

// Service Worker hook
export function useServiceWorker() {
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
                setRegistration(reg);

                // Check for updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    setInstalling(true);

                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setUpdateAvailable(true);
                                setInstalling(false);
                            }
                        });
                    }
                });
            });

            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                const { type, data } = event.data;

                if (type === 'UPDATE_AVAILABLE') {
                    setUpdateAvailable(true);
                }
            });
        }
    }, []);

    const applyUpdate = useCallback(() => {
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }, [registration]);

    const checkForUpdate = useCallback(async () => {
        if (registration) {
            await registration.update();
        }
    }, [registration]);

    return {
        registration,
        updateAvailable,
        installing,
        applyUpdate,
        checkForUpdate
    };
}

// Cache storage hook
export function useCacheStorage() {
    const [cacheSize, setCacheSize] = useState<number>(0);
    const [cacheKeys, setCacheKeys] = useState<string[]>([]);

    const updateCacheInfo = useCallback(async () => {
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                setCacheKeys(cacheNames);

                let totalSize = 0;
                for (const cacheName of cacheNames) {
                    const cache = await caches.open(cacheName);
                    const requests = await cache.keys();

                    for (const request of requests) {
                        try {
                            const response = await cache.match(request);
                            if (response) {
                                const blob = await response.blob();
                                totalSize += blob.size;
                            }
                        } catch (error) {
                            // Skip failed requests
                        }
                    }
                }

                setCacheSize(totalSize);
            } catch (error) {
                console.error('Error calculating cache size:', error);
            }
        }
    }, []);

    const clearCache = useCallback(async () => {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            setCacheSize(0);
            setCacheKeys([]);
        }
    }, []);

    useEffect(() => {
        updateCacheInfo();
    }, [updateCacheInfo]);

    return {
        cacheSize,
        cacheKeys,
        updateCacheInfo,
        clearCache
    };
}

// Background sync hook
export function useBackgroundSync() {
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'failed'>('idle');
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const requestSync = useCallback(async (tag: string = 'background-sync-parking') => {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register(tag);
                setSyncStatus('syncing');
                console.log('Background sync requested:', tag);
            } catch (error) {
                console.error('Background sync registration failed:', error);
                setSyncStatus('failed');
            }
        }
    }, []);

    useEffect(() => {
        // Listen for sync events from service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                const { type, data } = event.data;

                if (type === 'BACKGROUND_SYNC_SUCCESS') {
                    setSyncStatus('idle');
                    setLastSync(new Date());
                } else if (type === 'BACKGROUND_SYNC_FAILED') {
                    setSyncStatus('failed');
                }
            });
        }
    }, []);

    return {
        syncStatus,
        lastSync,
        requestSync
    };
}

// Storage quota hook
export function useStorageQuota() {
    const [quota, setQuota] = useState<StorageEstimate | null>(null);
    const [loading, setLoading] = useState(true);

    const updateQuota = useCallback(async () => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                setQuota(estimate);
            } catch (error) {
                console.error('Error getting storage estimate:', error);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        updateQuota();
    }, [updateQuota]);

    const getUsagePercentage = useCallback(() => {
        if (!quota || !quota.usage || !quota.quota) return 0;
        return Math.round((quota.usage / quota.quota) * 100);
    }, [quota]);

    const formatBytes = useCallback((bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

    return {
        quota,
        loading,
        updateQuota,
        getUsagePercentage,
        formatBytes
    };
}

// Notification permission hook
export function useNotificationPermission() {
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        }
        return 'denied';
    }, []);

    const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
        if (permission === 'granted' && 'serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            return registration.showNotification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });
        }
    }, [permission]);

    return {
        permission,
        requestPermission,
        showNotification
    };
}

// Combined offline features hook
export function useOfflineFeatures() {
    const isOnline = useOnlineStatus();
    const pwa = usePWAInstall();
    const serviceWorker = useServiceWorker();
    const cache = useCacheStorage();
    const sync = useBackgroundSync();
    const quota = useStorageQuota();
    const notifications = useNotificationPermission();

    return {
        isOnline,
        pwa,
        serviceWorker,
        cache,
        sync,
        quota,
        notifications
    };
}