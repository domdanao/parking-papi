import { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}

export function useApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const makeRequest = useCallback(async <T = any>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        url: string,
        data?: any,
        options: {
            withAuth?: boolean;
            headers?: Record<string, string>;
        } = {}
    ): Promise<ApiResponse<T> | null> => {
        setLoading(true);
        setError(null);

        try {
            // Get CSRF token from meta tag
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            };

            if (token) {
                headers['X-CSRF-TOKEN'] = token;
            }

            // Get auth token from localStorage or cookie if available
            if (options.withAuth !== false) {
                const authToken = localStorage.getItem('auth_token');
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }
            }

            const response = await axios({
                method,
                url: `/api${url}`,
                data,
                headers,
            });

            return response.data as ApiResponse<T>;
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
            setError(errorMessage);

            // Handle authentication errors
            if (err.response?.status === 401) {
                // Redirect to login
                router.visit('/login');
            }

            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const get = useCallback(<T = any>(url: string, options?: any) =>
        makeRequest<T>('GET', url, undefined, options), [makeRequest]);

    const post = useCallback(<T = any>(url: string, data?: any, options?: any) =>
        makeRequest<T>('POST', url, data, options), [makeRequest]);

    const put = useCallback(<T = any>(url: string, data?: any, options?: any) =>
        makeRequest<T>('PUT', url, data, options), [makeRequest]);

    const del = useCallback(<T = any>(url: string, options?: any) =>
        makeRequest<T>('DELETE', url, undefined, options), [makeRequest]);

    return {
        loading,
        error,
        get,
        post,
        put,
        delete: del,
        clearError: () => setError(null),
    };
}

// Specific API hooks for common operations
export function useParkingApi() {
    const api = useApi();

    const searchNearby = useCallback(async (params: {
        latitude: number;
        longitude: number;
        radius?: number;
        vehicle_type?: string;
        amenities?: string[];
        max_price?: number;
        limit?: number;
    }) => {
        return api.get('/parking-slots/nearby', {
            params: new URLSearchParams(params as any).toString()
        });
    }, [api]);

    const scanQR = useCallback(async (qrData: string, location: { latitude: number; longitude: number }) => {
        return api.post('/qr/scan', {
            qr_data: qrData,
            location: {
                ...location,
                accuracy: 10.0
            },
            scan_timestamp: new Date().toISOString()
        });
    }, [api]);

    const activatePayment = useCallback(async (params: {
        scan_id: string;
        session_token: string;
        duration_minutes: number;
        payment_method: { type: string };
    }) => {
        return api.post('/qr/activate-payment', params);
    }, [api]);

    const topUpWallet = useCallback(async (amount: number, paymentMethodId: string) => {
        return api.post('/wallet/top-up', {
            amount,
            payment_method_id: paymentMethodId
        });
    }, [api]);

    const getPaymentMethods = useCallback(async () => {
        return api.get('/payment-methods');
    }, [api]);

    return {
        ...api,
        searchNearby,
        scanQR,
        activatePayment,
        topUpWallet,
        getPaymentMethods,
    };
}