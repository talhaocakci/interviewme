# Lambda Functions

Serverless backend functions for the chat and video call application.

## Structure

```
lambda/
├── auth/
│   └── handler.py          # Authentication functions
├── chat/
│   └── handler.py          # Chat & messaging functions
├── websocket/
│   └── handler.py          # WebSocket handlers
├── requirements.txt        # Python dependencies
└── deploy.sh              # Package & deploy script
```

## Functions

### Auth Functions
- `register` - User registration
- `login` - User login
- `get_current_user` - Get user info from token

### Chat Functions
- `create_conversation` - Create new chat
- `get_conversations` - List user's chats
- `send_message` - Send message
- `get_messages` - Get message history

### WebSocket Functions
- `connect` - Handle WebSocket connection
- `disconnect` - Handle disconnection
- `send_message` - Route messages to participants
- `default` - Handle other events

## Building

### Prerequisites

- Python 3.11 (recommended) or Python 3.9+
- pip

### Install Dependencies

```bash
# Create package directory
mkdir -p package

# Install dependencies
python3 -m pip install -r requirements.txt -t ./package

# Or use binary wheels only (faster, no compilation)
python3 -m pip install -r requirements.txt -t ./package --only-binary :all:
```

### Package Functions

```bash
# Run deployment script
./deploy.sh
```

This creates:
- `auth.zip`
- `chat.zip`
- `websocket.zip`

## Deployment

After packaging, deploy with Terraform:

```bash
cd ../terraform
terraform apply
```

## Testing Locally

### Install Dependencies

```bash
python3 -m pip install -r requirements.txt
```

### Test Auth Function

```python
# test_auth.py
import json
from auth.handler import register, login

# Test registration
event = {
    'body': json.dumps({
        'email': 'test@example.com',
        'password': 'test123',
        'full_name': 'Test User'
    })
}

response = register(event, None)
print(response)
```

Run:
```bash
python3 test_auth.py
```

## Environment Variables

Functions expect these environment variables (set by Terraform):

- `DYNAMODB_TABLE` - DynamoDB table name
- `USERS_TABLE` - Users table name (same as DYNAMODB_TABLE)
- `JWT_SECRET_KEY` - Secret for JWT tokens
- `S3_BUCKET` - S3 bucket name
- `WEBSOCKET_API_ID` - WebSocket API Gateway ID
- `AWS_REGION` - AWS region
- `STAGE` - Deployment stage (dev/prod)

## Dependencies

### Core
- `boto3` - AWS SDK
- `pydantic` - Data validation

### Auth
- `python-jose` - JWT handling
- `passlib` - Password hashing
- `email-validator` - Email validation

## Troubleshooting

### Build Errors

**Error: Failed to build pydantic-core**

Solution: Install with binary wheels:
```bash
python3 -m pip install -r requirements.txt -t ./package --only-binary :all:
```

**Error: pip command not found**

Solution: Use `python3 -m pip` instead:
```bash
python3 -m pip install -r requirements.txt -t ./package
```

**Error: Permission denied**

Solution: Install in user space:
```bash
python3 -m pip install -r requirements.txt -t ./package --user
```

### Runtime Errors

**Error: Module not found**

Solution: Make sure dependencies are in the ZIP:
```bash
# Check ZIP contents
unzip -l auth.zip | grep boto3

# Repackage if missing
cd auth
rm -rf ../package
python3 -m pip install -r ../requirements.txt -t .
zip -r ../auth.zip . -x "*.pyc" -x "__pycache__/*"
```

**Error: Unable to import module**

Solution: Handler path must match Lambda configuration:
- Lambda handler: `handler.register`
- File: `handler.py`
- Function: `def register(event, context):`

## Lambda Limits

- **Timeout**: 30s (API), 300s (WebSocket)
- **Memory**: 256-512 MB
- **Payload**: 6 MB (sync), 256 KB (async)
- **Package size**: 50 MB (zipped), 250 MB (unzipped)

## Cost Optimization

1. **Reduce package size**:
   ```bash
   # Remove unnecessary files
   cd package
   find . -name "*.pyc" -delete
   find . -name "__pycache__" -delete
   rm -rf boto3*  # Already in Lambda runtime
   rm -rf botocore*
   ```

2. **Use layers** for common dependencies:
   ```bash
   # Create layer
   mkdir python
   pip install -r requirements.txt -t python/
   zip -r layer.zip python/
   ```

3. **Minimize cold starts**:
   - Keep package small
   - Use provisioned concurrency (costs more)
   - Keep functions warm with scheduled pings

## Monitoring

### View Logs

```bash
# Real-time logs
aws logs tail /aws/lambda/chatvideo-auth-dev --follow

# Last 1 hour
aws logs tail /aws/lambda/chatvideo-auth-dev --since 1h
```

### Invoke Function

```bash
# Test invoke
aws lambda invoke \
  --function-name chatvideo-auth-dev \
  --payload '{"body":"{}"}' \
  response.json

cat response.json
```

### Metrics

Check CloudWatch for:
- Invocations
- Duration
- Errors
- Throttles

## Best Practices

1. **Keep functions small** - One responsibility per function
2. **Use environment variables** - Don't hardcode values
3. **Handle errors gracefully** - Return proper HTTP codes
4. **Log important events** - Use `print()` or `logging`
5. **Minimize cold starts** - Keep packages small
6. **Use connection pooling** - Reuse DB connections
7. **Set appropriate timeouts** - Don't waste time/money
8. **Test locally first** - Faster development cycle

## Resources

- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [Python Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)

