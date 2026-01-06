# GitHub Actions with AWS OIDC (No Access Keys!)

This guide explains how to use GitHub Actions with AWS using OpenID Connect (OIDC) instead of storing long-lived AWS access keys.

## Why OIDC Instead of Access Keys?

### Problems with Access Keys
- ❌ Long-lived credentials that can be leaked
- ❌ Need to rotate regularly
- ❌ Stored in GitHub secrets (another place to secure)
- ❌ If leaked, attacker has permanent access until rotated

### Benefits of OIDC
- ✅ **No stored credentials** - GitHub gets temporary tokens from AWS
- ✅ **Automatic expiration** - Tokens expire after use
- ✅ **Fine-grained control** - Specific repos/branches only
- ✅ **Audit trail** - CloudTrail logs all access
- ✅ **Zero maintenance** - No credential rotation needed
- ✅ **Industry best practice** - Recommended by AWS and GitHub

## How It Works

```
┌──────────────┐
│   GitHub     │
│   Actions    │
└──────┬───────┘
       │ 1. Request JWT token
       │    (signed by GitHub)
       ▼
┌──────────────┐
│   GitHub     │
│   OIDC       │
│   Provider   │
└──────┬───────┘
       │ 2. Return JWT token
       ▼
┌──────────────┐
│   GitHub     │
│   Actions    │
└──────┬───────┘
       │ 3. Exchange JWT for
       │    AWS credentials
       ▼
┌──────────────┐
│     AWS      │
│     STS      │
└──────┬───────┘
       │ 4. Verify JWT signature
       │ 5. Check trust policy
       │ 6. Return temporary credentials
       ▼
┌──────────────┐
│   GitHub     │
│   Actions    │
│   (Can now   │
│   access AWS)│
└──────────────┘
```

## Setup Steps

### 1. Configure GitHub Repository in Terraform

Edit `terraform/terraform.tfvars`:

```hcl
# Add your GitHub repository
github_repository = "yourusername/interviewme"
```

### 2. Deploy Infrastructure

```bash
cd terraform
terraform apply
```

This creates:
- ✅ GitHub OIDC Provider in AWS
- ✅ IAM Role for GitHub Actions
- ✅ Policies for S3, CloudFront, Secrets Manager

### 3. Get Role ARN

```bash
terraform output github_actions_role_arn
```

Output example:
```
arn:aws:iam::123456789012:role/chatvideo-github-actions-dev
```

### 4. Update GitHub Actions Workflow

Edit `.github/workflows/deploy.yml` and update the `AWS_ROLE_ARN`:

```yaml
env:
  AWS_ROLE_ARN: 'arn:aws:iam::YOUR_ACCOUNT:role/chatvideo-github-actions-dev'
```

Or use the helper script:

```bash
./update-workflow-role-arn.sh
```

### 5. Remove Old Secrets (if any)

```bash
# Delete old access key secrets (no longer needed!)
gh secret delete AWS_ACCESS_KEY_ID
gh secret delete AWS_SECRET_ACCESS_KEY
```

### 6. Test Deployment

```bash
git add .
git commit -m "Setup GitHub OIDC for AWS"
git push
```

Watch the Actions tab in GitHub - it should deploy successfully without any stored credentials!

## Verification

### Check OIDC Provider

```bash
aws iam list-open-id-connect-providers
```

### Check Role

```bash
aws iam get-role --role-name chatvideo-github-actions-dev
```

### View Trust Policy

```bash
aws iam get-role --role-name chatvideo-github-actions-dev \
  --query 'Role.AssumeRolePolicyDocument' \
  --output json
```

Should show GitHub as trusted principal:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:yourusername/interviewme:*"
        }
      }
    }
  ]
}
```

## Permissions

The GitHub Actions role has these permissions:

### S3 Access
- `s3:PutObject` - Upload files
- `s3:GetObject` - Read files
- `s3:DeleteObject` - Delete old files
- `s3:ListBucket` - List bucket contents

### CloudFront Access
- `cloudfront:CreateInvalidation` - Clear cache
- `cloudfront:GetInvalidation` - Check invalidation status
- `cloudfront:ListInvalidations` - List invalidations

### Secrets Manager Access
- `secretsmanager:GetSecretValue` - Read secrets
- `secretsmanager:DescribeSecret` - Get secret metadata

## Security Features

### Repository Restriction

The role can only be assumed by your specific repository:

```hcl
Condition = {
  StringLike = {
    "token.actions.githubusercontent.com:sub" = "repo:yourusername/interviewme:*"
  }
}
```

### Branch Restriction (Optional)

To restrict to specific branches, update the trust policy:

```hcl
Condition = {
  StringEquals = {
    "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
  }
  StringLike = {
    "token.actions.githubusercontent.com:sub" = "repo:yourusername/interviewme:ref:refs/heads/main"
  }
}
```

### Environment Restriction (Optional)

To restrict to specific GitHub environments:

```hcl
StringLike = {
  "token.actions.githubusercontent.com:sub" = "repo:yourusername/interviewme:environment:production"
}
```

## Troubleshooting

### Error: Not authorized to perform sts:AssumeRoleWithWebIdentity

**Cause**: Trust policy doesn't match your repository

**Solution**: Verify `github_repository` in `terraform.tfvars` is correct:
```bash
cd terraform
terraform output github_oidc_provider_arn
terraform apply
```

### Error: OIDC provider not found

**Cause**: OIDC provider not created in AWS

**Solution**:
```bash
cd terraform
terraform apply
```

### Error: Token audience does not match

**Cause**: GitHub token audience mismatch

**Solution**: Ensure workflow has correct permissions:
```yaml
permissions:
  id-token: write
  contents: read
```

### Role ARN not found

**Cause**: `github_repository` variable not set

**Solution**:
```bash
cd terraform
# Edit terraform.tfvars and add:
# github_repository = "yourusername/interviewme"
terraform apply
```

## Multiple Repositories

To allow multiple repositories to use the same role:

```hcl
Condition = {
  StringLike = {
    "token.actions.githubusercontent.com:sub" = [
      "repo:user/repo1:*",
      "repo:user/repo2:*"
    ]
  }
}
```

## Multiple Environments

For staging and production:

```bash
# Development
cd terraform
terraform workspace select dev
terraform apply -var="github_repository=user/repo" -var="environment=dev"

# Production
terraform workspace select production
terraform apply -var="github_repository=user/repo" -var="environment=production"
```

Each environment gets its own IAM role with separate permissions.

## Cleanup

To remove OIDC setup (and go back to access keys):

1. **Remove from Terraform**:
   ```bash
   cd terraform
   # Edit terraform.tfvars:
   github_repository = ""
   terraform apply
   ```

2. **Re-enable access keys** (if needed):
   ```bash
   aws iam create-access-key --user-name chatvideo-app-user-dev
   ```

## Migration Guide

### From Access Keys to OIDC

1. Set `github_repository` in Terraform
2. Apply Terraform changes
3. Update workflow file with role ARN
4. Test deployment
5. Delete old access key secrets

### From OIDC back to Access Keys (Not Recommended)

1. Generate new access keys in AWS
2. Set GitHub secrets
3. Update workflow to use access keys
4. Remove `github_repository` from Terraform
5. Apply Terraform changes

## Best Practices

1. ✅ **Use OIDC for all new projects**
2. ✅ **Restrict to specific repositories**
3. ✅ **Restrict to specific branches for production**
4. ✅ **Enable CloudTrail for audit logs**
5. ✅ **Use separate roles per environment**
6. ✅ **Follow principle of least privilege**
7. ✅ **Monitor role usage with CloudWatch**

## Cost

OIDC with AWS has **no additional cost**:
- ✅ Free to create OIDC provider
- ✅ Free to assume roles
- ✅ Free STS API calls
- ✅ Only pay for resources used (S3, CloudFront, etc.)

## Additional Resources

- [AWS OIDC Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

