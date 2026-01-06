# Deployment Summary

## Quick Start

### Automated Setup (Recommended)

```bash
./setup-github-deploy.sh
```

This script will:
1. Deploy AWS infrastructure (S3, CloudFront, API Gateway, Lambda, DynamoDB)
2. Set up GitHub secrets automatically
3. Initialize Git repository
4. Create GitHub repository and push code

### Manual Setup

See [GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md) for detailed instructions.

## Architecture

```
┌─────────────┐
│   GitHub    │
│   Actions   │
└──────┬──────┘
       │ On push to main
       ▼
┌─────────────┐
│    Build    │
│  Expo Web   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│   AWS S3    │────▶│  CloudFront  │
│   Bucket    │     │ Distribution │
└─────────────┘     └───────┬──────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   End Users   │
                    │   (Browser)   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  API Gateway  │
                    │   + Lambda    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   DynamoDB    │
                    │      S3       │
                    └───────────────┘
```

## Components

### Frontend
- **Technology**: React Native (Expo Web)
- **Hosting**: AWS S3 + CloudFront CDN
- **Deployment**: GitHub Actions (automatic on push)
- **URL**: CloudFront domain (or custom domain)

### Backend
- **API**: AWS Lambda + API Gateway (REST + WebSocket)
- **Database**: DynamoDB (serverless)
- **Storage**: S3 (for video recordings)
- **Authentication**: JWT with multi-provider support

## Deployment Flow

1. **Developer pushes code** to `main` branch
2. **GitHub Actions triggers**:
   - Installs dependencies
   - Creates production `.env` file with secrets
   - Builds Expo web app
   - Syncs files to S3 with proper cache headers
   - Invalidates CloudFront cache
3. **CloudFront serves** updated content globally
4. **Users access** the updated app immediately

## Environment Variables

### GitHub Secrets (Only 2 Required!)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

**All other secrets are stored in AWS Secrets Manager** for better security and centralized management.

### AWS Secrets Manager (Automatic)
These secrets are automatically created by Terraform and fetched during deployment:
- `API_BASE_URL` - API Gateway URL
- `WS_URL` - WebSocket URL  
- `S3_BUCKET_NAME` - S3 bucket for web hosting
- `CLOUDFRONT_DISTRIBUTION_ID` - CloudFront distribution ID
- `JWT_SECRET` - JWT signing key
- `AWS_REGION` - AWS region

See [AWS_SECRETS_MANAGER.md](./AWS_SECRETS_MANAGER.md) for details.

### Mobile App (.env)
```env
API_BASE_URL=https://xxxxx.execute-api.region.amazonaws.com/dev
WS_URL=wss://xxxxx.execute-api.region.amazonaws.com/dev
```

## Costs

### Free Tier (First 12 months)
- CloudFront: 1 TB data transfer/month
- S3: 5 GB storage, 20,000 GET, 2,000 PUT
- Lambda: 1M requests, 400,000 GB-seconds
- DynamoDB: 25 GB storage, 25 RCU, 25 WCU
- API Gateway: 1M requests

### After Free Tier
For a small to medium app (1000-5000 users/month):
- **CloudFront**: $5-10/month
- **S3**: <$1/month
- **Lambda**: $5-15/month
- **DynamoDB**: $0-5/month (on-demand pricing)
- **API Gateway**: $3-5/month
- **Total**: ~$15-35/month

## Cache Strategy

### Static Assets (JS, CSS, Images)
- **Cache-Control**: `public, max-age=31536000, immutable`
- **CloudFront TTL**: 1 year
- Versioned filenames ensure cache busting

### HTML Files
- **Cache-Control**: `public, max-age=0, must-revalidate`
- **CloudFront TTL**: No cache
- Always fetches latest for proper updates

### API Responses
- No caching (dynamic content)
- Direct to Lambda via API Gateway

## Monitoring

### CloudWatch Logs
- Lambda function logs
- API Gateway access logs
- Error tracking

### CloudFront Metrics
- Cache hit ratio
- Request count
- Error rates
- Data transfer

### Custom Metrics
- User registrations
- Video call duration
- API response times

## Security

### Frontend
- ✅ HTTPS only (CloudFront enforced)
- ✅ S3 bucket private (CloudFront OAC)
- ✅ CORS properly configured
- ✅ No exposed secrets in code

### Backend
- ✅ JWT authentication
- ✅ Lambda execution roles (least privilege)
- ✅ DynamoDB encryption at rest
- ✅ S3 encryption at rest
- ✅ API Gateway rate limiting

## Custom Domain Setup

To use your own domain (e.g., `app.yourdomain.com`):

1. **Get SSL certificate** in AWS Certificate Manager (us-east-1):
   ```bash
   aws acm request-certificate \
     --domain-name app.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Update Terraform** (`terraform/cloudfront.tf`):
   ```hcl
   resource "aws_cloudfront_distribution" "web_app" {
     aliases = ["app.yourdomain.com"]
     
     viewer_certificate {
       acm_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT:certificate/ID"
       ssl_support_method  = "sni-only"
     }
   }
   ```

3. **Add DNS record** (CNAME):
   ```
   app.yourdomain.com → d111111abcdef8.cloudfront.net
   ```

4. **Apply changes**:
   ```bash
   cd terraform
   terraform apply
   ```

## Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Verify all secrets are set
- Ensure `mobile/package.json` is valid

### 403/404 Errors
- Wait for CloudFront cache invalidation (1-5 minutes)
- Check S3 bucket has files
- Verify CloudFront distribution is deployed

### API Errors
- Check Lambda logs in CloudWatch
- Verify API Gateway integration
- Check DynamoDB permissions

### Video Call Not Working
- Verify WebSocket URL is correct
- Check browser console for errors
- Ensure HTTPS is used (getUserMedia requires secure context)

## Rollback

To rollback to a previous version:

1. **Find previous commit**:
   ```bash
   git log --oneline
   ```

2. **Revert and push**:
   ```bash
   git revert HEAD
   git push
   ```

3. **Or manual rollback**:
   ```bash
   # Checkout old version
   git checkout <commit-hash>
   
   # Build and deploy manually
   cd mobile
   npm run build
   aws s3 sync ./web-build s3://BUCKET_NAME --delete
   aws cloudfront create-invalidation --distribution-id ID --paths "/*"
   ```

## Support

- **Documentation**: See all `*.md` files in project root
- **GitHub Issues**: Report bugs and feature requests
- **AWS Support**: For infrastructure issues
- **Logs**: CloudWatch for detailed error logs

