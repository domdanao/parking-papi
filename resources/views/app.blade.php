<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{-- PWA Manifest --}}
        <link rel="manifest" href="/manifest.json">

        {{-- Icons --}}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        {{-- PWA Meta Tags --}}
        <meta name="theme-color" content="#3B82F6">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="Parking Platform">
        <meta name="msapplication-TileColor" content="#3B82F6">
        <meta name="msapplication-config" content="/browserconfig.xml">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia

        {{-- Connection Status Indicator --}}
        <div id="connection-status" style="display: none;" class="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 text-sm z-50">
            Offline mode
        </div>

        {{-- Notifications Container --}}
        <div id="notifications" class="fixed top-4 right-4 z-50 space-y-2"></div>

        {{-- Service Worker Registration --}}
        <script>
            // Register service worker and initialize PWA features
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js')
                        .then((registration) => {
                            console.log('SW registered: ', registration);
                        })
                        .catch((registrationError) => {
                            console.log('SW registration failed: ', registrationError);
                        });
                });
            }
        </script>

        {{-- PWA Styles --}}
        <style>
            .notification {
                @apply max-w-sm mx-auto bg-white border border-gray-200 rounded-lg shadow-lg p-4;
                animation: slideIn 0.3s ease-out;
            }

            .notification-success {
                @apply border-green-200 bg-green-50;
            }

            .notification-error {
                @apply border-red-200 bg-red-50;
            }

            .notification-warning {
                @apply border-yellow-200 bg-yellow-50;
            }

            .notification-message {
                @apply block text-sm text-gray-700;
            }

            .notification-success .notification-message {
                @apply text-green-700;
            }

            .notification-error .notification-message {
                @apply text-red-700;
            }

            .notification-warning .notification-message {
                @apply text-yellow-700;
            }

            .notification-close {
                @apply absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg leading-none;
            }

            .install-banner {
                @apply fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 z-50;
            }

            .install-content {
                @apply flex items-center justify-between max-w-4xl mx-auto;
            }

            .install-actions {
                @apply flex gap-2;
            }

            .update-banner {
                @apply fixed top-0 left-0 right-0 bg-indigo-600 text-white p-3 z-50;
            }

            .update-content {
                @apply flex items-center justify-between max-w-4xl mx-auto;
            }

            .offline {
                filter: grayscale(20%);
            }

            .pwa-installed .install-banner {
                display: none;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        </style>
    </body>
</html>
