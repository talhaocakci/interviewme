# Serverless Architecture

## Overview

This application uses a fully serverless architecture on AWS for maximum cost efficiency.

```
┌─────────────────────────────────────┐
│   Client (React Native)             │
│   iOS / Android / Web               │
└──────────────┬──────────────────────┘
               │
               │ HTTPS/WSS
               │
┌──────────────▼──────────────────────┐
│   AWS API Gateway                   │
│   - REST API                        │
│   - WebSocket API                   │
└──────────────┬──────────────────────┘
               │
               │ Invokes
               │
┌──────────────▼──────────────────────┐
│   AWS Lambda Functions              │
│   - Auth Handler                    │
│   - Chat Handler                    │
│   - Call Handler                    │
│   - WebSocket Handler               │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┬─────────────┐
       │                │             │
┌──────▼────┐   ┌──────▼────┐   ┌───▼────┐
│ DynamoDB  │   │    S3     │   │Cognito │
│  Tables   │   │ Storage   │   │  Auth  │
└───────────┘   └───────────┘   └────────┘
```

## Why Serverless?

### Cost Efficiency
- **Pay per use**: Only pay when functions execute
- **No idle costs**: No servers running 24/7
- **Auto-scaling**: Scales to zero when not in use
- **Free tier**: 1M Lambda requests/month free

### Estimated Costs
- **Development**: $0-5/month (within free tier)
- **Production (1000 users)**: $10-30/month
- **Production (10000 users)**: $50-150/month

Compare to traditional:
- **EC2 + RDS**: $40-80/month minimum (even with no traffic)

## Components

### 1. DynamoDB Tables
- **Users**: User profiles and auth
- **Conversations**: Chat rooms
- **Messages**: Chat messages
- **Calls**: Call records
- **Connections**: WebSocket connections

### 2. Lambda Functions
- **Auth**: Login, register, tokens
- **API**: REST endpoints
- **WebSocket**: Real-time messaging
- **Call**: Video call signaling

### 3. S3
- Video recordings
- File uploads
- Static assets

### 4. API Gateway
- REST API for HTTP endpoints
- WebSocket API for real-time chat
- Custom domain support
- CORS handling

### 5. Cognito (Optional)
- User authentication
- OAuth integration
- Token management

## Data Model (DynamoDB)

### Single Table Design

```
PK                    SK                      Attributes
-------------------------------------------------------------------
USER#123             PROFILE                  email, name, avatar
USER#123             CONNECTION#abc           connectionId, timestamp
CONV#456             METADATA                 name, isGroup, created
CONV#456             PARTICIPANT#123          userId, joinedAt
CONV#456             MESSAGE#789              content, senderId, timestamp
CALL#789             METADATA                 status, startedAt, duration
CONNECTION#abc       USER#123                 userId, timestamp
```

### Benefits
- **Single table**: Lower cost, better performance
- **No joins**: All data in one query
- **Scalable**: Handles millions of items
- **Cost**: $0.25/GB/month for storage

## Cost Breakdown

### Monthly Costs (estimated)

**Free Tier (0-1000 users):**
- Lambda: FREE (within 1M requests)
- DynamoDB: FREE (within 25 GB)
- S3: $1-3 (storage only)
- API Gateway: FREE (within 1M requests)
- **Total: $1-5/month**

**Light Usage (1000-5000 users):**
- Lambda: $5-10
- DynamoDB: $5-10
- S3: $3-10
- API Gateway: $5-10
- **Total: $20-40/month**

**Medium Usage (10000+ users):**
- Lambda: $20-50
- DynamoDB: $20-40
- S3: $10-30
- API Gateway: $20-30
- **Total: $70-150/month**

## Advantages

✅ **Cost Efficient**: Pay only for what you use
✅ **Auto-scaling**: Handles traffic spikes automatically
✅ **No maintenance**: AWS manages infrastructure
✅ **High availability**: 99.99% uptime SLA
✅ **Global**: Deploy to multiple regions easily
✅ **Fast deployment**: Deploy in minutes
✅ **Built-in monitoring**: CloudWatch included

## Limitations

⚠️ **Cold starts**: First request may be slower (300-500ms)
⚠️ **Timeout**: Lambda max 15 minutes per request
⚠️ **WebSocket**: 2 hour connection limit
⚠️ **Learning curve**: Different from traditional servers

### Solutions
- **Cold starts**: Keep functions warm with scheduled pings
- **Timeouts**: Use step functions for long processes
- **WebSocket**: Reconnect automatically on disconnect
- **Learning**: Good documentation provided

## Development vs Production

### Development
- Use local DynamoDB for testing
- Mock S3 with local storage
- Use Lambda local invoke
- No cost!

### Production
- Full AWS deployment
- CloudWatch monitoring
- X-Ray tracing
- Auto-scaling enabled

## Deployment

```bash
# Deploy infrastructure
cd terraform
terraform init
terraform apply

# Deploy Lambda functions
cd ../lambda
./deploy.sh

# Deploy frontend
cd ../mobile
npm run build:web
aws s3 sync build/ s3://your-bucket/
```

## Monitoring

- **CloudWatch Logs**: All Lambda logs
- **CloudWatch Metrics**: Request counts, errors, latency
- **X-Ray**: Request tracing
- **DynamoDB Metrics**: Read/write capacity

## Security

- **IAM Roles**: Least privilege access
- **API Keys**: Rate limiting
- **WAF**: DDoS protection
- **Encryption**: At rest and in transit
- **VPC**: Optional for enhanced security

