# GitHub Deployment Guide

This guide explains how to deploy the web application to AWS S3 and CloudFront using GitHub Actions.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Repository** (this project)
3. **Terraform** installed locally (for initial infrastructure setup)

## Step 1: Deploy Infrastructure with Terraform

First, create the S3 bucket and CloudFront distribution:

```bash
cd terraform

# Initialize Terraform (if not already done)
terraform init

# Apply the infrastructure (including CloudFront)
terraform apply

# Save the outputs
terraform output web_s3_bucket_name
terraform output cloudfront_distribution_id
terraform output cloudfront_domain_name
```

## Step 2: Configure GitHub Secrets

**Important**: This setup uses AWS Secrets Manager for storing application secrets. You only need to set AWS credentials in GitHub.

Add the following secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### Required GitHub Secrets (Only 2!):

1. **AWS_ACCESS_KEY_ID**
   - Your AWS access key ID
   - Can be obtained from: `terraform output -raw iam_access_key_id`

2. **AWS_SECRET_ACCESS_KEY**
   - Your AWS secret access key
   - Can be obtained from: `terraform output -raw iam_secret_access_key`

All other secrets (API URLs, S3 bucket, CloudFront ID, etc.) are stored in AWS Secrets Manager and fetched automatically during deployment.

### To add secrets via GitHub CLI:

```bash
# Get AWS credentials from Terraform
AWS_KEY=$(terraform output -raw iam_access_key_id)
AWS_SECRET=$(terraform output -raw iam_secret_access_key)

# Set GitHub secrets (only AWS credentials needed)
gh secret set AWS_ACCESS_KEY_ID --body "$AWS_KEY"
gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET"

# Verify the secret name in AWS
terraform output -raw secrets_manager_secret_name
```

### Update GitHub Actions Workflow

Make sure the secret name in `.github/workflows/deploy.yml` matches your AWS Secrets Manager secret:

```yaml
env:
  AWS_SECRET_NAME: 'chatvideo-app-secrets-dev'  # Should match terraform output
```

Get the correct name:
```bash
terraform output -raw secrets_manager_secret_name
```

## Step 3: Initialize Git Repository

```bash
cd /Users/talhaocakci/projects/interviewme

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Chat video application with serverless backend"

# Create GitHub repository (via GitHub CLI)
gh repo create interviewme --private --source=. --remote=origin

# Or manually add remote
# git remote add origin https://github.com/YOUR_USERNAME/interviewme.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Automatic Deployment

Once everything is set up, the deployment happens automatically:

1. **Push to `main` branch** → triggers deployment
2. GitHub Actions will:
   - Build the web application
   - Upload to S3
   - Invalidate CloudFront cache
   - Provide deployment summary

## Step 5: Access Your Application

After successful deployment, access your app at:

```
https://CLOUDFRONT_DOMAIN_NAME
```

Get the URL:
```bash
terraform output web_app_url
```

## Manual Deployment (Optional)

If you want to deploy manually without GitHub Actions:

```bash
cd mobile

# Install dependencies
npm install

# Create production .env
cat > .env << EOF
API_BASE_URL=YOUR_API_URL
WS_URL=YOUR_WS_URL
EOF

# Build for web
npx expo export --platform web --output-dir ./web-build

# Deploy to S3
aws s3 sync ./web-build s3://YOUR_BUCKET_NAME --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Monitoring

### View Deployment Logs

- Go to your GitHub repository
- Click "Actions" tab
- Click on the latest workflow run

### CloudFront Logs (Optional)

Enable CloudFront logging in `terraform/cloudfront.tf`:

```hcl
resource "aws_cloudfront_distribution" "web_app" {
  # ... existing config ...

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logs.bucket_domain_name
    prefix          = "cloudfront/"
  }
}
```

## Custom Domain (Optional)

To use a custom domain:

1. **Get SSL Certificate** in AWS Certificate Manager (us-east-1 region)
2. **Update Terraform** (`terraform/cloudfront.tf`):

```hcl
resource "aws_cloudfront_distribution" "web_app" {
  # Add aliases
  aliases = ["yourdomain.com", "www.yourdomain.com"]

  viewer_certificate {
    acm_certificate_arn      = "arn:aws:acm:us-east-1:ACCOUNT:certificate/ID"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

3. **Update DNS** to point to CloudFront distribution
4. **Apply Terraform changes**: `terraform apply`

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify all secrets are set correctly
3. Ensure AWS credentials have proper permissions

### 403 Error

- CloudFront hasn't picked up new files yet
- Wait a few minutes or create invalidation manually

### Changes Not Visible

- Browser cache: Hard refresh (Ctrl+Shift+R)
- CloudFront cache: Create invalidation (done automatically by workflow)

### API Errors

- Check that API_BASE_URL in GitHub secrets matches your API Gateway URL
- Verify CORS settings in backend

## Cost Optimization

### CloudFront

- Free tier: 1 TB data transfer out/month
- After: ~$0.085/GB in US/Europe
- Consider `PriceClass_100` for lower costs (North America & Europe only)

### S3

- Free tier: 5 GB storage, 20,000 GET requests, 2,000 PUT requests
- Very minimal cost after free tier

### Estimated Monthly Cost

For a small app with moderate traffic:
- **$0-5/month** (within free tier)
- **$10-20/month** (1000-5000 users)

## Security Best Practices

1. **Enable CloudFront WAF** (optional, costs extra)
2. **Use HTTPS only** (already configured)
3. **Rotate AWS credentials** regularly
4. **Monitor CloudWatch** for unusual activity
5. **Enable MFA** on AWS account

## Next Steps

- [ ] Set up custom domain
- [ ] Enable CloudFront logging
- [ ] Set up CloudWatch alarms
- [ ] Configure backup strategy
- [ ] Set up staging environment

## Support

For issues:
1. Check GitHub Actions logs
2. Review Terraform outputs
3. Verify AWS console for resource status

