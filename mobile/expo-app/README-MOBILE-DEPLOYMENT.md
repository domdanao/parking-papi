# 📱 Mobile App Deployment Guide - EAS

This guide covers deploying the Parking Papi mobile app using Expo Application Services (EAS).

## 📋 Prerequisites

- ✅ EAS project created: `c113a07f-58c8-4da2-9305-f65b27e1c1ab`
- ✅ Expo CLI and EAS CLI installed globally
- ✅ Laravel Cloud backend deployed and accessible

## 🔧 Initial Setup

### 1. Update app.json Configuration

You need to update the `owner` field in `app.json`:

```json
{
  "expo": {
    "owner": "your-actual-expo-username"
  }
}
```

Replace `"your-expo-username"` with your actual Expo username.

### 2. Environment Variables

Create a `.env` file in the mobile app directory:

```bash
# Copy from .env.example
cp .env.example .env
```

Update the values:
```bash
API_BASE_URL=https://your-laravel-cloud-domain.com/api
WEB_BASE_URL=https://your-laravel-cloud-domain.com
APP_ENVIRONMENT=production
```

### 3. GitHub Repository Secrets

Add these secrets to your GitHub repository:

```bash
# EAS deployment
EXPO_TOKEN=your_expo_access_token

# Mobile app configuration
MOBILE_API_BASE_URL=https://your-laravel-cloud-domain.com/api
MOBILE_WEB_BASE_URL=https://your-laravel-cloud-domain.com
```

## 🚀 Deployment Commands

### Local Development Build
```bash
cd mobile/expo-app
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Preview Build (Internal Testing)
```bash
eas build --profile preview --platform all
```

### Production Build (App Store Release)
```bash
eas build --profile production --platform all
```

## 📦 Build Profiles

### Development
- **Purpose**: Testing on physical devices during development
- **Distribution**: Internal only
- **Features**: Development client enabled

### Preview
- **Purpose**: Internal testing and stakeholder review
- **Distribution**: Internal distribution via Expo
- **Features**: Simulator builds for iOS, APK for Android

### Production
- **Purpose**: App Store and Play Store release
- **Distribution**: Public app stores
- **Features**: Optimized builds, AAB for Android

## 🔄 Automated Deployment

### GitHub Actions Workflow

The mobile app includes automated deployment:

1. **On Push to Main**: Triggers preview build
2. **Manual Dispatch**: Choose build profile (development/preview/production)
3. **Automatic Testing**: Runs TypeScript, tests, and linting before build

### Triggering Manual Builds

1. Go to GitHub Actions tab
2. Select "EAS Mobile App Deployment" workflow
3. Click "Run workflow"
4. Choose build profile
5. Click "Run workflow"

## 📱 App Store Submission

### iOS App Store

1. **Build production version**:
   ```bash
   eas build --profile production --platform ios
   ```

2. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

3. **Required**:
   - Apple Developer account
   - App Store Connect app created
   - Update `eas.json` with your Apple ID and team ID

### Google Play Store

1. **Build production version**:
   ```bash
   eas build --profile production --platform android
   ```

2. **Submit to Play Store**:
   ```bash
   eas submit --platform android
   ```

3. **Required**:
   - Google Play Developer account
   - Service account JSON key
   - Update `eas.json` with service account path

## 🔧 Configuration Updates

### For App Store Submission

Update `eas.json` submit section:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-actual-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Bundle Identifiers

The app is configured with:
- **iOS**: `dev.danao.parkingpapi`
- **Android**: `dev.danao.parkingpapi`

## 🔍 Monitoring & Testing

### Development Testing
```bash
# Install development build on device
eas build --profile development --platform ios
# Then install via Expo Go or development build
```

### Internal Distribution
```bash
# Share preview builds with team
eas build --profile preview --platform all
# Share link from EAS dashboard
```

### Over-the-Air Updates
```bash
# Publish updates without rebuilding
eas update --branch production --message "Bug fixes"
```

## ⚠️ Important Notes

1. **Bundle Identifier**: Must match exactly in Apple Developer and Google Play accounts
2. **Permissions**: Camera and Location permissions are pre-configured
3. **Environment**: Different configurations for development vs production
4. **Updates**: OTA updates work for JavaScript changes only, not native changes

## 🆘 Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check EAS CLI version: `eas --version`
   - Verify project ID in app.json
   - Check environment variables

2. **Submission Fails**:
   - Verify Apple/Google credentials
   - Check bundle identifier matches registered app
   - Ensure certificates are valid

3. **App Won't Connect to API**:
   - Verify API_BASE_URL in environment
   - Check network permissions
   - Test API endpoint directly

### Getting Help

- **EAS Dashboard**: https://expo.dev/accounts/your-account/projects/parking-papi
- **Build Logs**: Available in EAS dashboard
- **Expo Documentation**: https://docs.expo.dev/

## ✅ Next Steps

1. Update `owner` in app.json with your Expo username
2. Set up environment variables
3. Configure GitHub secrets
4. Run your first preview build
5. Test on physical device
6. Configure app store credentials for production