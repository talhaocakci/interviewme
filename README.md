# Live Chat & Video Call Application - Serverless Edition

A full-featured, cross-platform chat and video calling application built with React Native (Expo) and AWS Serverless infrastructure.

## 🚀 Features

### Authentication
- ✅ Email/Password registration and login
- ✅ Google OAuth (ready to integrate)
- ✅ Facebook Login (ready to integrate)
- ✅ Apple Sign In (ready to integrate)
- ✅ JWT-based authentication with refresh tokens

### Real-time Chat
- ✅ One-on-one messaging
- ✅ Group conversations
- ✅ Real-time message delivery via WebSocket (API Gateway WebSocket)
- ✅ Typing indicators
- ✅ Message history and pagination
- ✅ Media attachments (images, videos, audio, files)
- ✅ Message replies
- ✅ User presence (last seen)

### Video Calling
- ✅ WebRTC-based video calls
- ✅ One-on-one video calls
- ✅ Group video calls (multiple participants)
- ✅ Camera/microphone controls
- ✅ Switch camera (front/back)
- ✅ Call recording with S3 upload
- ✅ WebRTC signaling through WebSocket

### Cross-Platform Support
- ✅ iOS (native app)
- ✅ Android (native app)
- ✅ Web (browser)

## 🏗️ Serverless Architecture

```
┌─────────────────────────────────────┐
│         Client Layer                │
│  (React Native - iOS/Android/Web)   │
└──────────────┬──────────────────────┘
               │
               │ HTTPS/WSS
               │
┌──────────────▼──────────────────────┐
│       AWS API Gateway               │
│  - REST API                         │
│  - WebSocket API                    │
└──────────────┬──────────────────────┘
               │
         ┌─────┴─────┬──────────┐
         │           │          │
┌────────▼─┐  ┌─────▼────┐  ┌──▼────────┐
│AWS Lambda│  │DynamoDB  │  │   AWS S3  │
│Functions │  │ NoSQL DB │  │  Storage  │
└──────────┘  └──────────┘  └───────────┘
```

### Why Serverless?

✅ **No Servers to Manage** - Focus on code, not infrastructure
✅ **Auto-Scaling** - Handles 0 to millions of requests
✅ **Cost-Efficient** - Pay only for what you use ($0-5/month for development)
✅ **High Availability** - 99.99% uptime SLA
✅ **Global Reach** - Deploy to multiple regions easily

## 📁 Project Structure

```
interviewme/
├── lambda/                  # AWS Lambda functions
│   ├── auth/               
│   │   └── handler.py      # Authentication functions
│   ├── chat/               
│   │   └── handler.py      # Chat & messaging functions
│   ├── websocket/          
│   │   └── handler.py      # WebSocket handlers
│   ├── requirements.txt
│   ├── deploy.sh           # Package & deploy script
│   └── build-docker.sh     # Build with Podman/Docker
│
├── terraform/               # Infrastructure as Code
│   ├── main.tf             # Core resources (DynamoDB, S3)
│   ├── lambda.tf           # Lambda functions
│   ├── api_gateway.tf      # API Gateway routes
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
│
├── mobile/                  # React Native frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── screens/        # Screen components
│   │   ├── navigation/     # Navigation setup
│   │   ├── services/       # API & WebSocket clients
│   │   ├── store/          # Redux store
│   │   └── utils/          # Utilities
│   ├── App.tsx
│   └── package.json
│
├── setup.sh                 # Automated setup script
├── QUICKSTART.md           # Quick start guide
├── SERVERLESS_DEPLOY.md    # Detailed deployment guide
├── ARCHITECTURE.md         # Architecture documentation
└── PODMAN_SETUP.md        # Podman/Docker setup guide
```

## 💻 Tech Stack

### Backend (Serverless)
- **Compute**: AWS Lambda (Python 3.11)
- **Database**: AWS DynamoDB (NoSQL)
- **API**: AWS API Gateway (REST + WebSocket)
- **Storage**: AWS S3
- **Authentication**: JWT tokens
- **Infrastructure**: Terraform
- **No servers!** ✨

### Frontend
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit
- **UI Library**: React Native Paper
- **Navigation**: React Navigation
- **Real-time**: WebSocket
- **Video**: react-native-webrtc
- **Platform Support**: iOS, Android, Web

## 🚀 Quick Start

### Prerequisites

- **AWS Account** ([Create free account](https://aws.amazon.com/free/))
- **Node.js 16+** ([Download](https://nodejs.org))
- **Python 3.9+** ([Download](https://python.org))
- **Podman or Docker** (Optional but recommended)
- **Terraform** (Auto-installed by setup script)
- **AWS CLI** (Auto-installed by setup script)

### One-Line Setup

```bash
# Run automated setup
./setup.sh
```

This installs all dependencies and sets up the project!

### Manual Setup

#### 1. Configure AWS

```bash
# Configure AWS credentials
aws configure

# Enter your credentials when prompted
```

#### 2. Build Lambda Functions

```bash
cd lambda

# With Podman/Docker (recommended)
./deploy.sh

# The script automatically detects Podman or Docker
```

#### 3. Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Deploy to AWS
terraform apply
```

#### 4. Get API URLs

```bash
# Get your API Gateway URLs
terraform output api_gateway_url
terraform output websocket_url
terraform output s3_bucket_name
```

#### 5. Configure Frontend

```bash
cd mobile

# Create .env with your API URLs
cat > .env << EOF
API_BASE_URL=https://your-api-url.amazonaws.com/dev
WS_URL=wss://your-websocket-url.amazonaws.com/dev
EOF
```

#### 6. Start Frontend

```bash
npm start

# Then:
# Press 'w' for web
# Press 'i' for iOS simulator (Mac only)
# Press 'a' for Android emulator
```

## 📖 Detailed Guides

- **Quick Start**: See [QUICKSTART.md](QUICKSTART.md)
- **Deployment**: See [SERVERLESS_DEPLOY.md](SERVERLESS_DEPLOY.md)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Podman Setup**: See [PODMAN_SETUP.md](PODMAN_SETUP.md)

## 💰 Cost Breakdown

### Free Tier (First 12 months)
- Lambda: **1M requests/month FREE**
- DynamoDB: **25 GB storage FREE**
- API Gateway: **1M requests/month FREE**
- S3: **5 GB storage FREE**
- **Total: $0-5/month**

### After Free Tier
- **Light usage** (1K users): $10-30/month
- **Medium usage** (10K users): $50-150/month
- **Heavy usage** (100K+ users): $200-500/month

**Much cheaper than traditional servers!**

## 🔧 Configuration

### AWS Resources (Managed by Terraform)

All infrastructure is defined in `terraform/` and deployed automatically:

- ✅ DynamoDB table (single-table design)
- ✅ S3 bucket (with lifecycle policies)
- ✅ Lambda functions (auth, chat, websocket)
- ✅ API Gateway (REST + WebSocket)
- ✅ IAM roles and permissions
- ✅ CloudWatch logs

### Environment Variables

**Frontend (.env):**
```env
API_BASE_URL=https://your-api-url.amazonaws.com/dev
WS_URL=wss://your-websocket-url.amazonaws.com/dev
```

**Backend** (Set by Terraform automatically):
- `DYNAMODB_TABLE` - DynamoDB table name
- `JWT_SECRET_KEY` - Auto-generated secret
- `S3_BUCKET` - S3 bucket name
- `WEBSOCKET_API_ID` - WebSocket API ID
- `STAGE` - Deployment stage (dev/prod)

## 📡 API Documentation

### REST Endpoints

**Authentication:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

**Chat:**
- `GET /conversations` - List conversations
- `POST /conversations` - Create conversation
- `GET /conversations/{id}/messages` - Get messages
- `POST /conversations/{id}/messages` - Send message

**Uploads:**
- `POST /upload/presigned-url` - Get S3 upload URL

### WebSocket Events

**Connect:**
- `$connect` - WebSocket connection
- `$disconnect` - WebSocket disconnection

**Messages:**
- `sendMessage` - Send real-time message
- `typing` - Typing indicator
- `call_offer` - WebRTC offer
- `call_answer` - WebRTC answer
- `ice_candidate` - ICE candidate exchange

## 🚀 Deployment

### Development

```bash
# Deploy to dev environment
cd terraform
terraform workspace select dev  # or: terraform workspace new dev
terraform apply
```

### Production

```bash
# Deploy to production
cd terraform
terraform workspace new production
terraform apply -var="environment=production"
```

### Update Lambda Code

```bash
# Make changes to lambda code
cd lambda

# Rebuild and redeploy
./deploy.sh
cd ../terraform
terraform apply
```

### Multi-Region Deployment

```bash
# Deploy to multiple regions
terraform apply -var="aws_region=us-east-1"
terraform apply -var="aws_region=eu-west-1"
terraform apply -var="aws_region=ap-southeast-1"
```

## 🔍 Monitoring

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/chatvideo-auth-dev --follow

# View API Gateway logs
aws logs tail /aws/apigateway/chatvideo-dev --follow
```

### CloudWatch Metrics

Visit AWS Console → CloudWatch → Dashboards

Monitor:
- Lambda invocations & errors
- API Gateway requests
- DynamoDB read/write capacity
- S3 storage and requests

## 🧪 Testing

### Test Lambda Functions

```bash
# Invoke function directly
aws lambda invoke \
  --function-name chatvideo-auth-dev \
  --payload '{"body":"{}"}' \
  response.json

cat response.json
```

### Test API Endpoints

```bash
# Test registration
curl -X POST https://your-api-url.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test login
curl -X POST https://your-api-url.amazonaws.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 🛠️ Troubleshooting

### Lambda Build Errors

**Problem**: Python version compatibility issues

**Solution**: Use Podman/Docker
```bash
brew install podman
podman machine init
podman machine start
cd lambda && ./deploy.sh
```

### DynamoDB Permission Errors

**Problem**: Lambda can't access DynamoDB

**Solution**: Check IAM role permissions
```bash
cd terraform
terraform apply  # Reapply to fix permissions
```

### WebSocket Connection Failed

**Problem**: Frontend can't connect to WebSocket

**Solution**: Check WebSocket URL and CORS
```bash
# Get correct WebSocket URL
cd terraform
terraform output websocket_url

# Update mobile/.env with this URL
```

### S3 Upload Failed

**Problem**: Can't upload files to S3

**Solution**: Check bucket permissions and CORS
```bash
# Terraform automatically configures CORS
cd terraform
terraform apply
```

## 🔒 Security Best Practices

✅ **Secrets Management**: JWT secrets auto-generated by Terraform
✅ **IAM Roles**: Least privilege access for Lambda
✅ **API Gateway**: Rate limiting and throttling enabled
✅ **DynamoDB**: Encryption at rest enabled
✅ **S3**: Server-side encryption enabled
✅ **CloudWatch**: Audit logs for all API calls

### Additional Security

1. **Enable CloudTrail** for audit logs
2. **Set up WAF** for DDoS protection
3. **Use Secrets Manager** for sensitive data
4. **Enable API Gateway authentication**
5. **Implement rate limiting** per user

## 📈 Scaling

### Automatic Scaling

✅ **Lambda**: Scales automatically to 1000+ concurrent executions
✅ **DynamoDB**: Auto-scales with on-demand pricing
✅ **API Gateway**: Handles millions of requests
✅ **S3**: Unlimited storage capacity

No manual scaling needed!

### Cost Optimization

1. **Use lifecycle policies** - Auto-delete old recordings
2. **Monitor CloudWatch** - Set billing alarms
3. **Optimize Lambda** - Reduce memory/timeout if possible
4. **Use caching** - API Gateway caching for frequent requests

## 🧹 Cleanup

**⚠️ Warning: This deletes all data!**

```bash
cd terraform
terraform destroy
```

Type `yes` to confirm deletion of all resources.

## 🗺️ Roadmap

- [x] Serverless architecture
- [x] DynamoDB single-table design
- [x] Lambda functions
- [x] API Gateway REST + WebSocket
- [x] S3 file storage
- [x] Terraform infrastructure
- [ ] End-to-end encryption
- [ ] Voice messages
- [ ] Push notifications (SNS/Firebase)
- [ ] Message search (OpenSearch)
- [ ] Admin dashboard
- [ ] Analytics (CloudWatch Insights)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Multi-region active-active

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 💬 Support

For issues and questions:
- Check [QUICKSTART.md](QUICKSTART.md)
- Check [SERVERLESS_DEPLOY.md](SERVERLESS_DEPLOY.md)
- Open an issue on GitHub
- Review [AWS Lambda docs](https://docs.aws.amazon.com/lambda/)
- Review [Terraform AWS docs](https://registry.terraform.io/providers/hashicorp/aws/)

## 🙏 Acknowledgments

- AWS for the serverless platform
- React Native and Expo for cross-platform development
- Terraform for infrastructure as code
- WebRTC for video calling capabilities
- The open-source community

---

**Built with ❤️ using AWS Serverless**

No servers, no maintenance, just pure functionality! 🚀
