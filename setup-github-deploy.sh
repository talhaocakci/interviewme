#!/bin/bash

set -e

echo "========================================="
echo "GitHub Deployment Setup Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed. You'll need to set secrets manually.${NC}"
    GH_AVAILABLE=false
else
    GH_AVAILABLE=true
fi

if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS CLI is not installed. Manual deployment won't work.${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check complete${NC}"
echo ""

# Deploy infrastructure
echo "Step 1: Configuring Terraform..."
cd terraform

if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}Creating terraform.tfvars from example...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    
    # Ask for GitHub repository
    read -p "Enter your GitHub repository (format: username/repo): " GITHUB_REPO
    if [ -n "$GITHUB_REPO" ]; then
        echo "" >> terraform.tfvars
        echo "# GitHub Repository for OIDC" >> terraform.tfvars
        echo "github_repository = \"$GITHUB_REPO\"" >> terraform.tfvars
        echo -e "${GREEN}✓ Added GitHub repository to terraform.tfvars${NC}"
    fi
    
    echo -e "${YELLOW}Review terraform.tfvars and make any needed changes.${NC}"
    read -p "Continue with terraform apply? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please edit terraform/terraform.tfvars with your values, then run this script again."
        exit 1
    fi
fi

terraform init
terraform apply

echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo ""

# Get outputs
echo "Step 2: Collecting Terraform outputs..."
SECRET_NAME=$(terraform output -raw secrets_manager_secret_name)
CF_DOMAIN=$(terraform output -raw cloudfront_domain_name)
WEB_URL=$(terraform output -raw web_app_url)
ROLE_ARN=$(terraform output -raw github_actions_role_arn 2>/dev/null || echo "")

# Check if OIDC is configured
if [[ "$ROLE_ARN" != *"Not configured"* ]] && [ -n "$ROLE_ARN" ]; then
    USE_OIDC=true
    echo -e "${GREEN}✓ GitHub OIDC configured${NC}"
else
    USE_OIDC=false
    AWS_KEY=$(terraform output -raw iam_access_key_id)
    AWS_SECRET=$(terraform output -raw iam_secret_access_key)
    echo -e "${YELLOW}⚠️  Using access keys (OIDC not configured)${NC}"
fi

echo -e "${GREEN}✓ Outputs collected${NC}"
echo ""

# Display information
echo "========================================="
echo "Deployment Information"
echo "========================================="
echo ""
echo "Web App URL: $WEB_URL"
echo "CloudFront Domain: $CF_DOMAIN"
echo "AWS Secrets Manager Secret: $SECRET_NAME"
echo ""

if [ "$USE_OIDC" = true ]; then
    echo -e "${GREEN}✅ Using GitHub OIDC (No access keys needed!)${NC}"
    echo "IAM Role: $ROLE_ARN"
    echo ""
    echo "No GitHub secrets needed - OIDC handles authentication!"
else
    echo -e "${YELLOW}⚠️  Using AWS Access Keys (Consider switching to OIDC)${NC}"
    echo ""
    echo "To enable OIDC (recommended):"
    echo "1. Add 'github_repository = \"username/repo\"' to terraform.tfvars"
    echo "2. Run: terraform apply"
    echo "3. Run: ./update-workflow-role-arn.sh"
fi

echo ""
echo "Note: All application secrets (API URLs, S3 bucket, CloudFront ID)"
echo "      are stored in AWS Secrets Manager."
echo ""

# Set GitHub secrets or update workflow
if [ "$USE_OIDC" = true ]; then
    echo "Step 3: Updating GitHub Actions workflow..."
    
    cd ..
    if [ -f "update-workflow-role-arn.sh" ]; then
        ./update-workflow-role-arn.sh
    else
        echo -e "${YELLOW}⚠️  Run ./update-workflow-role-arn.sh to update workflow${NC}"
    fi
    cd terraform
else
    if [ "$GH_AVAILABLE" = true ]; then
        echo "Step 3: Setting GitHub secrets..."
        
        read -p "Do you want to set GitHub secrets automatically? (y/n) " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            gh secret set AWS_ACCESS_KEY_ID --body "$AWS_KEY"
            gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET"
            
            echo -e "${GREEN}✓ GitHub secrets set${NC}"
        fi
    else
        echo "Step 3: Manual GitHub secrets setup required"
        echo ""
        echo "Run: terraform output -raw iam_access_key_id"
        echo "Run: terraform output -raw iam_secret_access_key"
        echo ""
        echo "Then add to GitHub secrets."
    fi
fi

echo ""

# Initialize Git repository
cd ..
if [ ! -d ".git" ]; then
    echo "Step 4: Initializing Git repository..."
    
    read -p "Do you want to initialize Git repository? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git init
        git add .
        git commit -m "Initial commit: Chat video application"
        git branch -M main
        
        echo -e "${GREEN}✓ Git repository initialized${NC}"
        echo ""
        
        if [ "$GH_AVAILABLE" = true ]; then
            read -p "Create GitHub repository? (y/n) " -n 1 -r
            echo ""
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                read -p "Repository name [interviewme]: " REPO_NAME
                REPO_NAME=${REPO_NAME:-interviewme}
                
                read -p "Make repository private? (y/n) " -n 1 -r
                echo ""
                
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
                else
                    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
                fi
                
                echo -e "${GREEN}✓ GitHub repository created and pushed${NC}"
            fi
        else
            echo "To create GitHub repository manually:"
            echo "1. Create a new repository on GitHub"
            echo "2. git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
            echo "3. git push -u origin main"
        fi
    fi
fi

echo ""
echo "========================================="
echo "Setup Complete! 🎉"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Verify GitHub secrets are set"
echo "2. Push code to trigger deployment"
echo "3. Access your app at: https://$CF_DOMAIN"
echo ""
echo "For more information, see GITHUB_DEPLOY.md"

