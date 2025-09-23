# 🚀 Deployment Guide - Parking Papi

This guide covers deploying the Parking Papi application to Laravel Cloud using the standard GitHub integration.

## 📋 Prerequisites

- ✅ Laravel Cloud account with "parking-papi" project created
- ✅ EAS account for mobile app deployment
- ✅ GitHub repository connected to Laravel Cloud

## 🔧 Laravel Cloud Setup

### 1. Connect GitHub Repository

1. In your Laravel Cloud dashboard, go to your "parking-papi" project
2. Connect your GitHub repository to the project
3. Set the branch to deploy from (typically `main`)
4. Laravel Cloud will auto-detect your Laravel application

### 2. Set Environment Variables

In your Laravel Cloud dashboard, configure these environment variables:

#### Required Application Secrets
```bash
APP_KEY=base64:your_generated_app_key
REVERB_APP_KEY=your_reverb_app_key
REVERB_APP_SECRET=your_reverb_app_secret
PAYMENT_GATEWAY_API_KEY=your_payment_api_key
PAYMENT_GATEWAY_SECRET=your_payment_secret
```

#### Optional Configuration
```bash
APP_TIMEZONE=Asia/Manila
BROADCAST_DRIVER=reverb
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
```

### 3. Database & Services Setup

- **Database**: PostgreSQL 17 (you've already created this)
- **Cache**: Redis (add via Laravel Cloud dashboard)
- **Queue**: Will use Redis for queue processing

## 🚦 Deployment Process

### Automatic Deployment (Standard Laravel Cloud)

1. **Push to main branch** triggers automatic deployment:
   ```bash
   git push origin main
   ```

2. **Laravel Cloud automatically**:
   - Detects the push to connected branch
   - Runs composer install and npm build
   - Deploys your application
   - Runs database migrations if configured

### Manual Deployment

You can also trigger manual deployments from the Laravel Cloud dashboard by clicking the "Deploy" button.

## 📊 Monitoring & Health Checks

### Health Check Endpoint

The application includes a health check endpoint at `/health`:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "environment": "production",
  "services": {
    "database": "connected",
    "cache": "connected"
  }
}
```

### Laravel Cloud Monitoring

Laravel Cloud provides built-in monitoring for:
- Application uptime
- Response times
- Error rates
- Queue processing
- Database performance

## 🗄️ Database Management

### Migrations

Migrations run automatically during deployment. For manual migration:

```bash
# Via Laravel Cloud dashboard or CLI
php artisan migrate --force
```

### Database Access

Access your production database through Laravel Cloud dashboard or use database client with provided credentials.

## 📱 Mobile App Deployment (Next Step)

After successful Laravel Cloud deployment, proceed with EAS mobile app deployment:

1. Update API endpoints in mobile app
2. Configure EAS build profiles
3. Submit to app stores

## 🔧 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `composer install` dependencies
   - Verify Node.js version (should be 20)
   - Check for PHP 8.3 compatibility

2. **Database Connection Issues**
   - Verify PostgreSQL service is running
   - Check database credentials in secrets

3. **Cache/Queue Issues**
   - Verify Redis service is running
   - Check Horizon is properly configured

4. **WebSocket Issues**
   - Verify Reverb configuration
   - Check WebSocket port accessibility

### Logs Access

Access application logs through:
- Laravel Cloud dashboard
- `php artisan log:show` command
- Log files in storage directory

## 🔄 Rollback Strategy

If deployment issues occur:

1. **Via GitHub**: Revert commit and push
2. **Via Laravel Cloud**: Use previous deployment from dashboard
3. **Via API**: Deploy specific commit hash

## 📈 Performance Optimization

Production environment includes:
- PHP OPcache enabled
- Config/route/view caching
- Optimized Composer autoloader
- Minified frontend assets
- Redis caching

## 🔐 Security Considerations

- All sensitive data stored in Laravel Cloud secrets
- HTTPS enforced for all connections
- Database connections encrypted
- Session data stored in Redis
- CSRF protection enabled

## 📞 Support

For deployment issues:
- Check GitHub Actions logs
- Review Laravel Cloud deployment logs
- Verify all environment variables are set
- Test health check endpoint