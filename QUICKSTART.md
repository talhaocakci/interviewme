# Quick Start Guide - Serverless Edition

Get your serverless chat & video call application running on AWS!

## What You're Building

A fully serverless application with:
- ✅ AWS Lambda (compute)
- ✅ DynamoDB (database)
- ✅ API Gateway (REST + WebSocket)
- ✅ S3 (file storage)
- ✅ No servers to manage!
- ✅ Cost: **$0-5/month** (within free tier)

## Prerequisites

- AWS Account ([Create free account](https://aws.amazon.com/free/))
- Node.js 16+ ([Download](https://nodejs.org))
- Python 3.9+ ([Download](https://python.org))
- Podman or Docker (Optional but recommended for Lambda builds)

## 1. Clone & Setup (2 minutes)

```bash
cd /Users/talhaocakci/projects/interviewme

# Run automated setup
chmod +x setup.sh
./setup.sh
```

This installs:
- AWS CLI
- Terraform
- Node.js dependencies
- Python dependencies

## 2. Configure AWS (3 minutes)

```bash
# Configure AWS credentials
aws configure

# Enter your credentials:
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: us-east-1
# Default output format: json
```

**Don't have AWS credentials?**
1. Go to [AWS Console](https://console.aws.amazon.com)
2. Click your name → Security Credentials
3. Create Access Key
4. Copy Access Key ID and Secret

## 3. Deploy to AWS (5 minutes)

```bash
# Package Lambda functions
cd lambda
./deploy.sh

# Deploy infrastructure
cd ../terraform
terraform init
terraform apply
```

Type `yes` when prompted.

**Wait 3-5 minutes** while AWS creates:
- DynamoDB table
- Lambda functions
- API Gateway
- S3 bucket

## 4. Get Your API URLs (1 minute)

```bash
# Still in terraform directory
terraform output api_gateway_url
terraform output websocket_url
```

Example output:
```
api_gateway_url = "https://abc123.execute-api.us-east-1.amazonaws.com/dev"
websocket_url = "wss://xyz789.execute-api.us-east-1.amazonaws.com/dev"
```

**Copy these URLs!** You'll need them in the next step.

## 5. Configure Frontend (1 minute)

```bash
cd ../mobile

# Create .env file with your API URLs
cat > .env << 'EOF'
API_BASE_URL=https://YOUR_API_URL_FROM_STEP_4
WS_URL=wss://YOUR_WEBSOCKET_URL_FROM_STEP_4
EOF

# Replace with actual URLs from step 4!
```

Or edit manually:
```bash
nano .env
```

## 6. Start Frontend (2 minutes)

```bash
# Still in mobile directory
npm start
```

This opens Expo Developer Tools.

**Choose your platform:**

### Web (Easiest)
- Press `w` in terminal
- Opens at http://localhost:19006

### iOS (Mac only)
- Press `i` in terminal
- Opens iOS Simulator

### Android
- Start Android Emulator first
- Press `a` in terminal

### Physical Device
- Install "Expo Go" app
- Scan QR code

## 7. Test the App (3 minutes)

1. **Register:**
   - Email: `test@example.com`
   - Password: `test123`
   - Name: `Test User`

2. **Login** with your credentials

3. **Try features:**
   - Send messages (real-time!)
   - Start video call
   - Upload files

## What You Get

✅ **Authentication** - Email/password, OAuth ready
✅ **Real-time Chat** - WebSocket messaging
✅ **Video Calls** - WebRTC with call recording
✅ **File Storage** - S3 for media & recordings
✅ **Auto-scaling** - Handles 0 to millions of users
✅ **Cost-efficient** - Pay only for what you use

## Troubleshooting

### AWS CLI not configured
```bash
aws configure
# Enter your credentials
```

### Terraform command not found
```bash
# macOS
brew install terraform

# Linux
# See: https://terraform.io/downloads
```

### Lambda deployment fails

**Best solution: Use Podman/Docker**
```bash
# Install Podman (recommended)
brew install podman
podman machine init
podman machine start

# Build Lambda functions
cd lambda
./deploy.sh  # Automatically uses Podman
```

**Alternative: Local Python**
```bash
cd lambda

# Reinstall dependencies
rm -rf package
python3 -m pip install -r requirements.txt -t ./package

# Repackage
./deploy.sh
```

### Frontend can't connect
1. Check API URLs in `mobile/.env`
2. Make sure they match Terraform output
3. Include `https://` and `wss://` prefixes

### DynamoDB permission denied
```bash
# Check AWS credentials
aws sts get-caller-identity

# If it fails, reconfigure
aws configure
```

## Monitoring Your App

### View Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/chatvideo-auth-dev --follow

# API Gateway logs
aws logs tail /aws/apigateway/chatvideo-dev --follow
```

### Check Costs
```bash
# View current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost
```

Or visit: [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/)

## What's Running?

Your app is **100% serverless**:

- **No EC2 instances** ❌
- **No RDS database** ❌
- **No servers to manage** ❌
- **Auto-scaling** ✅
- **Pay per use** ✅
- **99.99% uptime** ✅

## Cost Breakdown

### Free Tier (First 12 months)
- Lambda: 1M requests/month FREE
- DynamoDB: 25 GB storage FREE
- API Gateway: 1M requests/month FREE
- S3: 5 GB storage FREE
- **Total: $0-5/month**

### After Free Tier
- **Light usage** (1K users): $10-30/month
- **Medium usage** (10K users): $50-150/month

**Much cheaper than traditional servers!**

## Next Steps

### 1. Customize Your App
```bash
# Edit Lambda functions
cd lambda/auth
nano handler.py

# Redeploy
cd ..
./deploy.sh
cd ../terraform
terraform apply
```

### 2. Add Custom Domain
```bash
# In terraform/main.tf, add:
resource "aws_route53_record" "api" {
  zone_id = "YOUR_ZONE_ID"
  name    = "api.yourdomain.com"
  type    = "A"
  # ... connect to API Gateway
}
```

### 3. Enable HTTPS
Already enabled! API Gateway provides HTTPS by default.

### 4. Set Up Monitoring
```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name chatvideo \
  --dashboard-body file://dashboard.json
```

### 5. Deploy to Production
```bash
cd terraform

# Create production workspace
terraform workspace new production

# Deploy with production settings
terraform apply -var="environment=production"
```

## Development Workflow

### Make Changes

```bash
# 1. Edit Lambda code
cd lambda/auth
nano handler.py

# 2. Redeploy
cd ..
./deploy.sh
cd ../terraform
terraform apply
```

### Test Changes

```bash
# Test Lambda directly
aws lambda invoke \
  --function-name chatvideo-auth-dev \
  --payload '{"body":"{}"}' \
  response.json

# View response
cat response.json
```

### View Logs

```bash
# Real-time logs
aws logs tail /aws/lambda/chatvideo-auth-dev --follow
```

## Cleanup

To delete everything:

```bash
cd terraform
terraform destroy
```

Type `yes` to confirm.

**⚠️ This deletes all data!**

## Summary of Commands

```bash
# Setup
./setup.sh

# Configure AWS
aws configure

# Deploy
cd lambda && ./deploy.sh
cd ../terraform && terraform apply

# Get URLs
terraform output

# Update frontend
nano mobile/.env

# Run app
cd mobile && npm start
```

## Support

- **Architecture**: See `ARCHITECTURE.md`
- **Detailed Deployment**: See `SERVERLESS_DEPLOY.md`
- **Terraform Docs**: See `terraform/README.md`
- **AWS Free Tier**: https://aws.amazon.com/free/

## Estimated Times

- **First deployment**: 15-20 minutes
- **Subsequent deployments**: 3-5 minutes
- **Code updates**: 2-3 minutes

---

**You're done! Your serverless app is live on AWS!** 🚀

No servers, no maintenance, just pure functionality at minimal cost!
