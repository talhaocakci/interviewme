# Deployment Guide

This guide covers deploying the Chat & Video Call application to production.

## Pre-Deployment Checklist

### Backend
- [ ] Set strong JWT_SECRET_KEY
- [ ] Configure production database (AWS RDS recommended)
- [ ] Set up AWS S3 bucket with proper CORS
- [ ] Configure environment variables
- [ ] Set up OAuth applications (Google, Facebook, Apple)
- [ ] Configure Twilio for SMS (if using phone auth)
- [ ] Set CORS_ORIGINS to production domains only
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Frontend
- [ ] Update API_BASE_URL to production
- [ ] Update WS_URL to production (wss://)
- [ ] Configure OAuth redirect URIs
- [ ] Test on all platforms (iOS, Android, Web)
- [ ] Optimize bundle size
- [ ] Configure app icons and splash screens
- [ ] Set up error tracking (e.g., Sentry)

## Backend Deployment

### Option 1: AWS EC2 with Docker

1. **Launch EC2 Instance**
```bash
# Use Ubuntu 22.04 LTS
# Recommended: t3.medium or larger
# Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8000 (API)
```

2. **Install Docker**
```bash
ssh ubuntu@your-ec2-ip
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
```

3. **Set up PostgreSQL**
```bash
# Option A: Use AWS RDS (recommended)
# Option B: Run PostgreSQL in Docker
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=chatdb \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15
```

4. **Deploy Backend**
```bash
# Clone repository
git clone your-repo-url
cd interviewme/backend

# Create .env file
nano .env
# Add production environment variables

# Build and run
docker build -t chat-backend .
docker run -d \
  --name chat-api \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  chat-backend
```

5. **Set up Nginx as Reverse Proxy**
```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/chat-api

# Add configuration:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://localhost:8000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/chat-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

### Option 2: Heroku

1. **Install Heroku CLI**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
heroku login
```

2. **Create Heroku App**
```bash
cd backend
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET_KEY=your-secret-key
heroku config:set AWS_ACCESS_KEY_ID=your-aws-key
heroku config:set AWS_SECRET_ACCESS_KEY=your-aws-secret
# ... set all required env vars
```

3. **Deploy**
```bash
# Create Procfile
echo "web: uvicorn app.main:application --host 0.0.0.0 --port \$PORT" > Procfile

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Option 3: Railway

1. **Sign up at railway.app**
2. **Click "New Project" → "Deploy from GitHub"**
3. **Select your repository**
4. **Add PostgreSQL database from Railway**
5. **Set environment variables in Railway dashboard**
6. **Railway will auto-deploy on push**

## Frontend Deployment

### Mobile Apps (iOS & Android)

1. **Configure EAS Build**
```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
```

2. **Update app.json**
```json
{
  "expo": {
    "name": "ChatVideo",
    "slug": "chat-video-app",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourdomain.chatvideo",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourdomain.chatvideo",
      "versionCode": 1
    }
  }
}
```

3. **Build for iOS**
```bash
# Create iOS build
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

4. **Build for Android**
```bash
# Create Android build
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

### Web Deployment

#### Option 1: Vercel

1. **Install Vercel CLI**
```bash
npm install -g vercel
cd mobile
vercel login
```

2. **Configure for Web**
```bash
# Build for web
expo build:web

# Deploy
cd web-build
vercel --prod
```

#### Option 2: Netlify

```bash
# Build
expo build:web

# Deploy
cd web-build
npx netlify-cli deploy --prod
```

#### Option 3: AWS S3 + CloudFront

```bash
# Build
expo build:web

# Upload to S3
aws s3 sync web-build/ s3://your-bucket-name --delete

# Create CloudFront distribution
# Point to S3 bucket
# Enable HTTPS
```

## Database Migration

For production database:

```bash
cd backend

# Create migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

## AWS S3 Configuration

1. **Create S3 Bucket**
- Name: `your-app-recordings`
- Region: `us-east-1` (or your preference)
- Block all public access: No (configure properly)

2. **Set Bucket Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-app-recordings/*"
    }
  ]
}
```

3. **Configure CORS**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. **Create IAM User**
- Create user with programmatic access
- Attach policy: `AmazonS3FullAccess` (or custom policy)
- Save Access Key ID and Secret Access Key

## Monitoring & Logging

### Backend Monitoring

1. **Set up Sentry**
```bash
pip install sentry-sdk
```

```python
# In app/main.py
import sentry_sdk
sentry_sdk.init(dsn="your-sentry-dsn")
```

2. **Set up CloudWatch (AWS)**
- Enable CloudWatch logs for EC2/ECS
- Create alarms for CPU, memory, errors

### Frontend Monitoring

1. **Set up Sentry for React Native**
```bash
npm install @sentry/react-native
```

2. **Configure in App.tsx**
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: 'production',
});
```

## Scaling Considerations

### Backend Scaling

1. **Horizontal Scaling**
- Use load balancer (AWS ALB, Nginx)
- Run multiple FastAPI instances
- Use Redis for session management

2. **Database Scaling**
- Use read replicas
- Implement connection pooling
- Add database indexes

3. **WebSocket Scaling**
- Use Redis adapter for Socket.IO
- Sticky sessions on load balancer

### Frontend Scaling

1. **CDN for Static Assets**
- Use CloudFront, Cloudflare, or similar
- Cache images and media files

2. **Code Splitting**
- Lazy load screens
- Optimize bundle size

## Backup Strategy

### Database Backups

```bash
# Automated daily backups (cron job)
0 2 * * * pg_dump chatdb > /backups/chatdb_$(date +\%Y\%m\%d).sql

# AWS RDS: Enable automated backups
```

### S3 Backups

- Enable S3 versioning
- Set up lifecycle policies
- Consider S3 Glacier for long-term storage

## SSL/TLS Certificates

Using Let's Encrypt (free):

```bash
# Certbot (already shown above)
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d app.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Post-Deployment

1. **Test All Features**
- Authentication (all methods)
- Chat messaging
- Video calls
- File uploads
- Recordings

2. **Monitor Performance**
- API response times
- WebSocket connections
- Database queries
- Error rates

3. **Security Audit**
- Check exposed endpoints
- Verify authentication
- Review logs for suspicious activity

4. **Documentation**
- Update API documentation
- Document deployment process
- Create runbooks for common issues

## Rollback Plan

If deployment fails:

```bash
# Backend rollback
docker stop chat-api
docker rm chat-api
docker run -d ... # previous version

# Frontend rollback
# Revert Git commit
git revert HEAD
git push

# Rebuild and redeploy
```

## Support & Maintenance

- Set up monitoring alerts
- Create incident response plan
- Schedule regular updates
- Monitor security advisories
- Review logs regularly

## Cost Estimation

**AWS (Small Scale):**
- EC2 t3.medium: ~$30/month
- RDS db.t3.micro: ~$15/month
- S3 Storage: ~$5/month
- Data Transfer: ~$10/month
**Total: ~$60-80/month**

**Heroku:**
- Hobby dyno: $7/month
- Postgres: $9/month
**Total: ~$16/month**

**Railway:**
- Starter plan: $5/month
- Database: $5/month
**Total: ~$10/month**

Prices vary based on usage and requirements.

