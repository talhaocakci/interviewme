# AWS Secrets Manager Integration

This project uses AWS Secrets Manager to store application secrets instead of GitHub Secrets. This provides better security, centralized management, and easier secret rotation.

## Architecture

```
┌──────────────────┐
│  GitHub Actions  │
│                  │
│  Only stores:    │
│  - AWS Access    │
│    Key ID        │
│  - AWS Secret    │
│    Access Key    │
└────────┬─────────┘
         │
         │ Fetch secrets
         ▼
┌──────────────────┐
│   AWS Secrets    │
│    Manager       │
│                  │
│  Stores:         │
│  - API URLs      │
│  - S3 Bucket     │
│  - CloudFront ID │
│  - JWT Secret    │
│  - Other configs │
└──────────────────┘
```

## Benefits

### 1. **Reduced GitHub Secrets**
- Only 2 GitHub secrets needed (AWS credentials)
- All other secrets in AWS Secrets Manager
- Cleaner GitHub repository settings

### 2. **Centralized Secret Management**
- One place to manage all secrets (AWS Console)
- Easier to audit and track changes
- CloudTrail logs all secret access

### 3. **Automatic Updates**
- Update secrets in AWS without touching GitHub
- Deployments automatically use latest values
- No need to update multiple repositories

### 4. **Better Security**
- Secrets encrypted at rest with AWS KMS
- Fine-grained IAM permissions
- Automatic secret rotation (can be enabled)
- Secret versioning and rollback

### 5. **Cost Effective**
- Free tier: 30 days trial, then $0.40/secret/month
- $0.05 per 10,000 API calls
- Much cheaper than alternatives

## Secret Structure

The secret is stored as a JSON object in AWS Secrets Manager:

```json
{
  "API_BASE_URL": "https://xxx.execute-api.us-east-1.amazonaws.com/dev",
  "WS_URL": "wss://xxx.execute-api.us-east-1.amazonaws.com/dev",
  "S3_BUCKET_NAME": "chatvideo-web-dev",
  "CLOUDFRONT_DISTRIBUTION_ID": "E1234567890ABC",
  "AWS_REGION": "us-east-1",
  "JWT_SECRET": "generated-secret-key"
}
```

## How It Works

### 1. Terraform Creates Secret

When you run `terraform apply`, it:
- Creates a secret in AWS Secrets Manager
- Populates it with all infrastructure outputs
- Sets up IAM permissions for GitHub Actions

### 2. GitHub Actions Fetches Secret

During deployment, GitHub Actions:
```yaml
- name: Fetch secrets from AWS Secrets Manager
  id: secrets
  run: |
    SECRET_JSON=$(aws secretsmanager get-secret-value \
      --secret-id chatvideo-app-secrets-dev \
      --query SecretString \
      --output text)
    
    # Parse and use secrets
    echo "API_BASE_URL=$(echo $SECRET_JSON | jq -r '.API_BASE_URL')" >> $GITHUB_OUTPUT
```

### 3. Secrets Used in Build

The fetched secrets are:
- Used to create `.env` file for Expo build
- Used to deploy to correct S3 bucket
- Used to invalidate correct CloudFront distribution

## Managing Secrets

### View Current Secrets

```bash
# Via Terraform
cd terraform
terraform output secrets_manager_secret_name

# Via AWS CLI
aws secretsmanager get-secret-value \
  --secret-id chatvideo-app-secrets-dev \
  --query SecretString \
  --output text | jq
```

### Update a Secret

```bash
# Update via AWS CLI
aws secretsmanager update-secret \
  --secret-id chatvideo-app-secrets-dev \
  --secret-string '{
    "API_BASE_URL": "https://new-url.amazonaws.com",
    "WS_URL": "wss://new-url.amazonaws.com",
    ...
  }'

# Or update via AWS Console:
# Services → Secrets Manager → Your Secret → Retrieve secret value → Edit
```

### Update via Terraform

If you redeploy infrastructure, secrets are automatically updated:

```bash
cd terraform
terraform apply
```

This updates the secret with new infrastructure URLs.

## IAM Permissions

The GitHub Actions IAM user has these permissions:

```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue",
    "secretsmanager:DescribeSecret"
  ],
  "Resource": "arn:aws:secretsmanager:region:account:secret:chatvideo-app-secrets-dev-*"
}
```

This allows:
- ✅ Reading secret values
- ✅ Viewing secret metadata
- ❌ Modifying secrets (read-only for security)

## Security Best Practices

### 1. **Rotate AWS Credentials Regularly**

```bash
# Generate new access key
cd terraform
terraform apply -var="rotate_access_key=true"

# Update GitHub secret
gh secret set AWS_ACCESS_KEY_ID --body "NEW_KEY"
gh secret set AWS_SECRET_ACCESS_KEY --body "NEW_SECRET"
```

### 2. **Enable Secret Rotation** (Optional)

For automatic JWT secret rotation:

```hcl
resource "aws_secretsmanager_secret_rotation" "app_secrets" {
  secret_id           = aws_secretsmanager_secret.app_secrets.id
  rotation_lambda_arn = aws_lambda_function.rotate_secret.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

### 3. **Monitor Secret Access**

Enable CloudTrail logging:

```bash
# View secret access logs
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=chatvideo-app-secrets-dev \
  --max-items 20
```

### 4. **Use Secret Versioning**

AWS Secrets Manager keeps previous versions:

```bash
# List versions
aws secretsmanager list-secret-version-ids \
  --secret-id chatvideo-app-secrets-dev

# Get specific version
aws secretsmanager get-secret-value \
  --secret-id chatvideo-app-secrets-dev \
  --version-id <version-id>
```

## Troubleshooting

### GitHub Actions Can't Fetch Secret

**Error**: `AccessDeniedException: User is not authorized to perform: secretsmanager:GetSecretValue`

**Solution**:
```bash
cd terraform
terraform apply  # Re-apply to fix IAM permissions
```

### Secret Not Found

**Error**: `ResourceNotFoundException: Secrets Manager can't find the specified secret`

**Solution**:
```bash
# Verify secret exists
aws secretsmanager list-secrets | grep chatvideo

# Check secret name in workflow matches Terraform output
terraform output secrets_manager_secret_name
```

### Wrong Secret Values

**Solution**:
```bash
# View current values
aws secretsmanager get-secret-value \
  --secret-id chatvideo-app-secrets-dev \
  --query SecretString \
  --output text | jq

# Update via Terraform
cd terraform
terraform apply
```

## Cost

### Pricing

- **Secret Storage**: $0.40 per secret per month
- **API Calls**: $0.05 per 10,000 requests
- **Free Tier**: 30 days free trial for new secrets

### Estimated Monthly Cost

For this project with 1 secret and ~100 deployments/month:
- Secret storage: $0.40
- API calls: ~$0.001
- **Total**: ~$0.40/month

Compare to managing secrets manually: **Priceless** 😄

## Migration from GitHub Secrets

If you're migrating from storing all secrets in GitHub:

1. **Deploy Terraform with Secrets Manager**:
   ```bash
   cd terraform
   terraform apply
   ```

2. **Update GitHub Secrets** (remove old ones):
   ```bash
   # Remove old secrets
   gh secret delete API_BASE_URL
   gh secret delete WS_URL
   gh secret delete S3_BUCKET_NAME
   gh secret delete CLOUDFRONT_DISTRIBUTION_ID
   
   # Keep only AWS credentials
   # (already set, no change needed)
   ```

3. **Update Workflow File**:
   - Already updated in `.github/workflows/deploy.yml`
   - Verify `AWS_SECRET_NAME` matches your secret

4. **Test Deployment**:
   ```bash
   git add .
   git commit -m "Migrate to AWS Secrets Manager"
   git push
   ```

## Additional Resources

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [GitHub Actions AWS Integration](https://github.com/aws-actions/configure-aws-credentials)
- [Best Practices for Secrets](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)

