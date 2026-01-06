# Secrets Management Quick Reference

## TL;DR

✅ **Only 2 secrets in GitHub** (AWS credentials)  
✅ **Everything else in AWS Secrets Manager**  
✅ **Automatic updates during Terraform apply**  
✅ **Secure, centralized, auditable**

## Setup (One-Time)

```bash
# 1. Deploy infrastructure
cd terraform
terraform apply

# 2. Get AWS credentials
AWS_KEY=$(terraform output -raw iam_access_key_id)
AWS_SECRET=$(terraform output -raw iam_secret_access_key)
SECRET_NAME=$(terraform output -raw secrets_manager_secret_name)

# 3. Set GitHub secrets (ONLY 2!)
gh secret set AWS_ACCESS_KEY_ID --body "$AWS_KEY"
gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET"

# 4. Update workflow file
# Edit .github/workflows/deploy.yml:
#   AWS_SECRET_NAME: 'chatvideo-app-secrets-dev'  # Use $SECRET_NAME

# 5. Done! Push to deploy
git push
```

## What Goes Where?

### GitHub Secrets (2)
```
AWS_ACCESS_KEY_ID      ← IAM access key
AWS_SECRET_ACCESS_KEY  ← IAM secret key
```

### AWS Secrets Manager (Everything Else)
```json
{
  "API_BASE_URL": "https://xxx.amazonaws.com/dev",
  "WS_URL": "wss://xxx.amazonaws.com/dev",
  "S3_BUCKET_NAME": "chatvideo-web-dev",
  "CLOUDFRONT_DISTRIBUTION_ID": "E123...",
  "AWS_REGION": "us-east-1",
  "JWT_SECRET": "auto-generated"
}
```

## Common Tasks

### View Secrets

```bash
# Get secret name
terraform output secrets_manager_secret_name

# View all secrets
aws secretsmanager get-secret-value \
  --secret-id chatvideo-app-secrets-dev \
  --query SecretString --output text | jq
```

### Update Secrets

```bash
# Option 1: Via Terraform (Recommended)
cd terraform
terraform apply  # Auto-updates secrets

# Option 2: Via AWS CLI
aws secretsmanager update-secret \
  --secret-id chatvideo-app-secrets-dev \
  --secret-string '{"API_BASE_URL":"new-value",...}'

# Option 3: Via AWS Console
# Services → Secrets Manager → Your Secret → Edit
```

### Rotate AWS Credentials

```bash
# 1. Generate new credentials in AWS Console
# 2. Update GitHub secrets
gh secret set AWS_ACCESS_KEY_ID --body "NEW_KEY"
gh secret set AWS_SECRET_ACCESS_KEY --body "NEW_SECRET"
```

## Troubleshooting

### Can't fetch secrets in GitHub Actions

**Check**: IAM permissions
```bash
cd terraform
terraform apply  # Fix permissions
```

### Secret not found

**Check**: Secret name matches
```bash
terraform output secrets_manager_secret_name
# Update AWS_SECRET_NAME in .github/workflows/deploy.yml
```

### Wrong values in secrets

**Fix**: Re-apply Terraform
```bash
cd terraform
terraform apply  # Updates secrets automatically
```

## Benefits Recap

| Aspect | GitHub Secrets | AWS Secrets Manager |
|--------|---------------|---------------------|
| **Number of secrets** | Many (6+) | Only 2 |
| **Updates** | Manual, each repo | Automatic, centralized |
| **Rotation** | Manual | Can be automated |
| **Audit trail** | Limited | Full CloudTrail logs |
| **Encryption** | GitHub-managed | AWS KMS (your keys) |
| **Cost** | Free | ~$0.40/month |
| **Security** | Good | Excellent |

## Cost

- $0.40/month for 1 secret
- $0.05 per 10,000 API calls
- ~100 deployments/month ≈ $0.40/month total

**Worth it?** Absolutely! 🎯

## More Info

- Full guide: [AWS_SECRETS_MANAGER.md](./AWS_SECRETS_MANAGER.md)
- Deployment: [GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md)
- Overview: [DEPLOY_SUMMARY.md](./DEPLOY_SUMMARY.md)

