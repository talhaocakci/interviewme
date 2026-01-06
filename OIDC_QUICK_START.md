# GitHub OIDC Quick Start (No Access Keys!)

## TL;DR

✅ **Zero GitHub secrets needed**  
✅ **No access keys to rotate**  
✅ **More secure than access keys**  
✅ **5 minute setup**

## Setup (One Command!)

```bash
./setup-github-deploy.sh
```

When prompted, enter your GitHub repository (e.g., `username/interviewme`).

That's it! The script will:
1. Configure GitHub OIDC in AWS
2. Update your workflow file
3. Deploy everything

## Manual Setup (If Needed)

```bash
# 1. Edit terraform.tfvars
cd terraform
echo 'github_repository = "username/interviewme"' >> terraform.tfvars

# 2. Deploy
terraform apply

# 3. Update workflow
cd ..
./update-workflow-role-arn.sh

# 4. Push
git add .
git commit -m "Setup GitHub OIDC"
git push
```

## What You Get

### Before (Access Keys)
```yaml
# In GitHub Secrets:
AWS_ACCESS_KEY_ID: AKIA...
AWS_SECRET_ACCESS_KEY: ...
```
❌ 2 secrets to manage  
❌ Keys can leak  
❌ Need rotation  

### After (OIDC)
```yaml
# In GitHub Secrets:
# (nothing!)
```
✅ **Zero secrets**  
✅ Temporary credentials only  
✅ No rotation needed  

## How It Works

```
GitHub Actions → AWS STS → Temporary Credentials → Deploy
     (JWT)         (Verify)      (15 min expiry)
```

GitHub gets short-lived AWS credentials automatically. No keys stored anywhere!

## Verify It's Working

```bash
# Check OIDC is configured
cd terraform
terraform output github_actions_role_arn

# Should output:
# arn:aws:iam::123456789012:role/chatvideo-github-actions-dev
```

Then push code and watch GitHub Actions - it should deploy without any stored credentials!

## Troubleshooting

### "Not configured - set github_repository variable"

```bash
cd terraform
echo 'github_repository = "yourusername/yourrepo"' >> terraform.tfvars
terraform apply
```

### "Not authorized to perform sts:AssumeRoleWithWebIdentity"

Check your repository name matches exactly:
```bash
terraform output github_oidc_provider_arn
# Verify the repository name in the trust policy
```

### Want to go back to access keys?

```bash
cd terraform
# Remove or comment out github_repository in terraform.tfvars
terraform apply

# Then set up access keys again
```

## More Info

- Full guide: [GITHUB_OIDC_SETUP.md](./GITHUB_OIDC_SETUP.md)
- AWS docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- GitHub docs: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

## Why This Matters

**Access keys leaked in public repos:**
- 2023: 10+ million secrets leaked on GitHub
- Average time to exploit: 7 seconds
- Cost: $1000s in AWS bills

**OIDC:**
- ✅ No secrets to leak
- ✅ If JWT is stolen, it expires in minutes
- ✅ Can only be used from your specific repository

**Use OIDC. Your future self will thank you.** 🔒

