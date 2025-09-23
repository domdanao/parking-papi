# 🔧 Environment Configuration Guide

This guide covers setting up environment variables and secrets for both Laravel Cloud and GitHub Actions deployment.

## 📋 Prerequisites

- ✅ Laravel Cloud project: `parking-papi`
- ✅ EAS project: `c113a07f-58c8-4da2-9305-f65b27e1c1ab`
- ✅ GitHub repository connected to Laravel Cloud
- ✅ PostgreSQL 17 database cluster created

## 🌐 Laravel Cloud Environment Variables

### Required Environment Variables

Set these in your Laravel Cloud project dashboard:

```bash
# Application
APP_NAME="Parking Papi"
APP_ENV=production
APP_KEY=base64:your-generated-key
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=https://your-laravel-cloud-domain.com

# Database (Auto-configured by Laravel Cloud)
DB_CONNECTION=pgsql
DB_HOST=your-database-host
DB_PORT=5432
DB_DATABASE=parking_papi
DB_USERNAME=your-username
DB_PASSWORD=your-password

# Cache & Session
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis (Auto-configured by Laravel Cloud)
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password
REDIS_PORT=6379

# Broadcasting (Laravel Reverb)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=your-laravel-cloud-domain.com
REVERB_PORT=443
REVERB_SCHEME=https

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="Parking Papi"

# Payment Gateway (Magpie)
MAGPIE_API_KEY=your-magpie-api-key
MAGPIE_WEBHOOK_SECRET=your-magpie-webhook-secret
MAGPIE_ENVIRONMENT=production

# SMS/OTP Service
SMS_PROVIDER=twilio
TWILIO_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Analytics & Monitoring
SENTRY_LARAVEL_DSN=your-sentry-dsn
ANALYTICS_ENABLED=true

# File Storage
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=parking-papi-production
AWS_USE_PATH_STYLE_ENDPOINT=false
```

## 🔐 GitHub Repository Secrets

### Required Secrets for Mobile Deployment

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

```bash
# EAS Mobile Deployment
EXPO_TOKEN=your-expo-access-token

# Mobile App Configuration
MOBILE_API_BASE_URL=https://your-laravel-cloud-domain.com/api
MOBILE_WEB_BASE_URL=https://your-laravel-cloud-domain.com

# Optional: App Store Credentials (for production submission)
APPLE_ID=your-apple-id@example.com
APPLE_TEAM_ID=your-apple-team-id
GOOGLE_SERVICE_ACCOUNT_KEY=your-base64-encoded-service-account-json
```

## 🚀 Laravel Cloud Setup Steps

### 1. Connect GitHub Repository

1. Go to your Laravel Cloud dashboard
2. Navigate to the `parking-papi` project
3. Connect your GitHub repository: `your-username/parking-papi`
4. Select the `main` branch for automatic deployments

### 2. Database Configuration

Your PostgreSQL 17 cluster should already be created. Laravel Cloud will auto-configure:
- Database connection variables
- SSL certificates
- Connection pooling

### 3. Redis Configuration

Laravel Cloud provides managed Redis. It will auto-configure:
- `REDIS_HOST`
- `REDIS_PASSWORD`
- `REDIS_PORT`

### 4. Domain & SSL

1. Configure your custom domain in Laravel Cloud
2. SSL certificates are automatically managed
3. Update `APP_URL` to match your domain

## 📱 Mobile App Configuration

### 1. Update Expo Username

Update the `owner` field in `mobile/expo-app/app.json`:

```json
{
  "expo": {
    "owner": "your-actual-expo-username"
  }
}
```

### 2. Create Mobile Environment File

The GitHub Actions workflow will create the `.env` file automatically using the secrets you configure.

### 3. Test Mobile Build

After setting up secrets, test the deployment:

```bash
# Trigger manual workflow from GitHub Actions
# Select: "EAS Mobile App Deployment"
# Choose build profile: "preview"
```

## 🔧 Environment-Specific Configuration

### Development vs Production

The mobile app automatically detects the environment:

- **Development**: Uses local Laravel server (`http://localhost:8000`)
- **Production**: Uses Laravel Cloud domain from environment variables

### Feature Flags

Configure these based on your needs:

```bash
# Mobile App Features
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
DEBUG_MODE=false

# Backend Features
QUEUE_ENABLED=true
BROADCASTING_ENABLED=true
CACHE_ENABLED=true
```

## 🔍 Verification Steps

### 1. Test Laravel Cloud Deployment

After setting environment variables:

```bash
# Check application health
curl https://your-laravel-cloud-domain.com/health

# Verify database connection
curl https://your-laravel-cloud-domain.com/api/health

# Test authentication
curl -X POST https://your-laravel-cloud-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 2. Test Mobile App Build

```bash
# Clone and test locally
git clone your-repo
cd parking-papi/mobile/expo-app
npm install
npx expo start

# Test EAS build
eas build --profile preview --platform all
```

## 🆘 Troubleshooting

### Common Issues

1. **Laravel Cloud Build Fails**:
   - Check all required environment variables are set
   - Verify database connection
   - Check Laravel logs in dashboard

2. **Mobile Build Fails**:
   - Verify `EXPO_TOKEN` secret is valid
   - Check `owner` field in app.json
   - Ensure EAS project ID is correct

3. **Database Connection Issues**:
   - Verify PostgreSQL 17 cluster is running
   - Check connection variables match cluster settings
   - Test connection from Laravel Cloud logs

4. **Redis Connection Issues**:
   - Verify Redis instance is provisioned
   - Check Redis connection variables
   - Test queue processing

### Getting Help

- **Laravel Cloud**: Support tickets in dashboard
- **EAS**: https://expo.dev/accounts/your-account/projects/parking-papi
- **GitHub Actions**: Check workflow logs for deployment issues

## ✅ Next Steps

1. ✅ Set Laravel Cloud environment variables
2. ✅ Configure GitHub repository secrets
3. ✅ Update Expo username in app.json
4. ✅ Test Laravel Cloud deployment
5. ✅ Test mobile app build
6. ✅ Configure custom domain
7. ✅ Set up monitoring and alerts

---

*Remember to keep your API keys and secrets secure. Never commit them to version control.*