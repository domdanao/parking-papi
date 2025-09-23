import 'dotenv/config';

export default ({ config }) => {
  const isProduction = process.env.APP_ENVIRONMENT === 'production';

  return {
    ...config,
    name: isProduction ? 'Parking Papi' : 'Parking Papi (Dev)',
    slug: 'parking-papi',
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000/api',
      webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:8000',
      environment: process.env.APP_ENVIRONMENT || 'development',
      enableOfflineMode: process.env.ENABLE_OFFLINE_MODE === 'true',
      enablePushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
      enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
      debugMode: process.env.DEBUG_MODE === 'true',
      eas: {
        projectId: 'c113a07f-58c8-4da2-9305-f65b27e1c1ab',
      },
    },
    updates: {
      url: `https://u.expo.dev/c113a07f-58c8-4da2-9305-f65b27e1c1ab`,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  };
};