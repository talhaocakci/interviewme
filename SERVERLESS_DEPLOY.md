# Serverless Deployment Guide

Complete guide for deploying the serverless architecture to AWS.

## Architecture Overview

**Serverless Stack:**
- **Lambda**: Compute (auth, chat, websocket)
- **DynamoDB**: Database (single table design)
- **API Gateway**: REST + WebSocket endpoints
- **S3**: File storage
- **CloudWatch**: Logs and monitoring

**No servers to manage!** ✨

## Cost Estimate

### Free Tier (First Year)
- Lambda: 1M requests/month FREE
- DynamoDB: 25 GB storage FREE  
- API Gateway: 1M requests/month FREE
- S3: 5 GB storage FREE
- **Total: $0-5/month**

### After Free Tier  
- **Light usage** (1K users): $10-30/month
- **Medium usage** (10K users): $50-150/month
- **Heavy usage** (100K+ users): $200-500/month

**Much cheaper than traditional servers! No EC2/RDS costs.**

## Prerequisites

1. **AWS Account**: [Create free account](https://aws.amazon.com/free/)
2. **AWS CLI**: 
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   pip install awscli
   ```

3. **Terraform**:
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

4. **Python 3.11+**: For Lambda functions
5. **Node.js 16+**: For frontend

## Step 1: Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Enter your credentials:
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: us-east-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

## Step 2: Package Lambda Functions

```bash
cd lambda

# Install dependencies and create ZIP files
./deploy.sh

# This creates:
# - auth.zip
# - chat.zip
# - websocket.zip
```

## Step 3: Configure Terraform

```bash
cd terraform

# Copy example
cp terraform.tfvars.example terraform.tfvars

# Edit configuration
nano terraform.tfvars
```

**Minimum configuration:**
```hcl
aws_region   = "us-east-1"
project_name = "chatvideo"
environment  = "dev"

cors_origins = [
  "http://localhost:19006",
  "https://yourdomain.com"
]
```

## Step 4: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy!
terraform apply
```

Type `yes` when prompted.

**Deployment takes ~3-5 minutes.**

## Step 5: Get Your API URLs

```bash
# Get all outputs
terraform output

# Get specific values
terraform output api_gateway_url
terraform output websocket_url
terraform output s3_bucket_name
```

Example output:
```
api_gateway_url = "https://abc123.execute-api.us-east-1.amazonaws.com/dev"
websocket_url = "wss://xyz789.execute-api.us-east-1.amazonaws.com/dev"
s3_bucket_name = "chatvideo-storage-dev"
```

## Step 6: Configure Frontend

Update `mobile/.env`:

```bash
# Get the URLs
API_URL=$(cd terraform && terraform output -raw api_gateway_url)
WS_URL=$(cd terraform && terraform output -raw websocket_url)

# Update mobile/.env
cat > mobile/.env << EOF
API_BASE_URL=$API_URL
WS_URL=$WS_URL
EOF
```

## Step 7: Test Your API

```bash
# Health check
curl https://your-api-url.amazonaws.com/dev/auth/me

# Register a user
curl -X POST https://your-api-url.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","full_name":"Test User"}'
```

## Step 8: Deploy Frontend

### Web (Static hosting)

```bash
cd mobile

# Build for web
npm run build:web

# Deploy to S3
aws s3 sync build/ s3://your-bucket-name/web/ --acl public-read

# Get S3 website URL
aws s3 website s3://your-bucket-name/ --index-document index.html

# Or use CloudFront for HTTPS
```

### Mobile Apps

```bash
# iOS & Android
npm install -g eas-cli
eas login
eas build --platform all
```

## Monitoring

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/chatvideo-auth-dev --follow

# View API Gateway logs
aws logs tail /aws/apigateway/chatvideo-dev --follow
```

### CloudWatch Metrics

Visit AWS Console → CloudWatch → Dashboards

Key metrics:
- Lambda invocations
- Lambda errors
- Lambda duration
- DynamoDB read/write units
- API Gateway requests

## Updating Code

### Update Lambda Functions

```bash
# Make changes to lambda code
cd lambda

# Rebuild
./deploy.sh

# Update in AWS
cd terraform
terraform apply
```

### Update Frontend

```bash
cd mobile

# Make changes

# Redeploy
npm run build:web
aws s3 sync build/ s3://your-bucket-name/web/
```

## Scaling

### DynamoDB Auto-Scaling

Already enabled with **Pay Per Request** billing mode!
- Scales automatically
- No capacity planning needed
- Pay only for what you use

### Lambda Concurrency

Default: 1000 concurrent executions (adjustable)

```bash
# Increase if needed
aws lambda put-function-concurrency \
  --function-name chatvideo-auth-dev \
  --reserved-concurrent-executions 5000
```

## Cost Optimization

### 1. Use Free Tier Wisely
- First 1M Lambda requests: FREE
- First 25 GB DynamoDB: FREE
- First 1M API Gateway requests: FREE

### 2. Clean Up Old Data
- Enable S3 lifecycle policies (already configured)
- Delete old recordings after 90 days
- Archive old messages

### 3. Monitor Costs
```bash
# Set up billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name high-billing \
  --alarm-description "Alert when bill exceeds $50" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold
```

### 4. Use Reserved Capacity (Optional)
For predictable workloads, reserve DynamoDB capacity for 40-75% savings.

## Backup & Recovery

### DynamoDB Backups

```bash
# Enable point-in-time recovery (production)
aws dynamodb update-continuous-backups \
  --table-name chatvideo-prod \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# Create on-demand backup
aws dynamodb create-backup \
  --table-name chatvideo-dev \
  --backup-name chatvideo-backup-$(date +%Y%m%d)
```

### S3 Versioning

Already enabled! Previous versions of files are preserved.

## Security Best Practices

1. **Never commit credentials**
   ```bash
   # Already in .gitignore:
   terraform.tfvars
   *.zip
   .env
   ```

2. **Use IAM roles** (not access keys) for Lambda

3. **Enable CloudTrail** for audit logs
   ```bash
   aws cloudtrail create-trail \
     --name chatvideo-trail \
     --s3-bucket-name your-cloudtrail-bucket
   ```

4. **Set up WAF** for DDoS protection (optional)

5. **Use secrets manager** for sensitive data
   ```bash
   aws secretsmanager create-secret \
     --name chatvideo/jwt-secret \
     --secret-string "your-secret-key"
   ```

## Troubleshooting

### Lambda Function Errors

```bash
# View logs
aws logs tail /aws/lambda/chatvideo-auth-dev --follow --format short

# Test function directly
aws lambda invoke \
  --function-name chatvideo-auth-dev \
  --payload '{"body":"{\"email\":\"test@example.com\"}"}' \
  response.json
```

### DynamoDB Issues

```bash
# Check table status
aws dynamodb describe-table --table-name chatvideo-dev

# Scan table (careful in production!)
aws dynamodb scan --table-name chatvideo-dev --limit 10
```

### API Gateway Issues

```bash
# Check API
aws apigatewayv2 get-api --api-id YOUR_API_ID

# View recent logs
aws logs tail /aws/apigateway/chatvideo-dev --since 1h
```

### Common Errors

**Error: "User pool does not exist"**
- Solution: Cognito is optional, remove it from config

**Error: "AccessDenied: S3"**
- Solution: Check IAM role permissions

**Error: "ValidationException: DynamoDB"**
- Solution: Check PK/SK key format

**Error: "Cold start timeout"**
- Solution: Increase Lambda timeout or memory

## Cleanup & Destroy

**⚠️ Warning: This deletes ALL data!**

```bash
cd terraform

# Preview what will be deleted
terraform plan -destroy

# Destroy everything
terraform destroy
```

## Multi-Region Deployment

Deploy to multiple regions for global reach:

```bash
# Deploy to us-east-1
cd terraform
terraform apply -var="aws_region=us-east-1"

# Deploy to eu-west-1
terraform workspace new eu-west-1
terraform apply -var="aws_region=eu-west-1"

# Deploy to ap-southeast-1
terraform workspace new ap-southeast-1
terraform apply -var="aws_region=ap-southeast-1"
```

## Production Checklist

Before going to production:

- [ ] Enable CloudWatch alarms
- [ ] Set up billing alerts
- [ ] Enable DynamoDB backups
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Enable WAF
- [ ] Set up CloudFront
- [ ] Configure monitoring dashboard
- [ ] Document runbooks
- [ ] Test disaster recovery
- [ ] Review security settings
- [ ] Enable CloudTrail
- [ ] Set up CI/CD pipeline

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Terraform AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws/
- **AWS Free Tier**: https://aws.amazon.com/free/
- **AWS Calculator**: https://calculator.aws/

## Estimated Deployment Time

- **First time**: 30-45 minutes
- **Subsequent deployments**: 5-10 minutes
- **Code updates only**: 2-3 minutes

## What's Next?

1. **Test the API** - Use Postman or curl
2. **Deploy frontend** - Follow mobile deployment guide
3. **Set up monitoring** - CloudWatch dashboards
4. **Add custom domain** - Route 53 + API Gateway
5. **Enable HTTPS** - AWS Certificate Manager
6. **Scale globally** - Multi-region deployment

---

**You now have a production-ready serverless application!** 🚀

No servers to manage, automatic scaling, pay only for what you use.

