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
echo "Step 1: Deploying infrastructure with Terraform..."
cd terraform

if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}Creating terraform.tfvars from example...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${RED}Please edit terraform/terraform.tfvars with your values, then run this script again.${NC}"
    exit 1
fi

terraform init
terraform apply

echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo ""

# Get outputs
echo "Step 2: Collecting Terraform outputs..."
WEB_BUCKET=$(terraform output -raw web_s3_bucket_name)
CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id)
CF_DOMAIN=$(terraform output -raw cloudfront_domain_name)
API_URL=$(terraform output -raw api_gateway_url)
WS_URL=$(terraform output -raw websocket_url)
AWS_KEY=$(terraform output -raw iam_access_key_id)
AWS_SECRET=$(terraform output -raw iam_secret_access_key)

echo -e "${GREEN}✓ Outputs collected${NC}"
echo ""

# Display information
echo "========================================="
echo "Deployment Information"
echo "========================================="
echo ""
echo "Web S3 Bucket: $WEB_BUCKET"
echo "CloudFront Distribution ID: $CF_DIST_ID"
echo "CloudFront Domain: $CF_DOMAIN"
echo "Web App URL: https://$CF_DOMAIN"
echo "API URL: $API_URL"
echo "WebSocket URL: $WS_URL"
echo ""

# Set GitHub secrets
if [ "$GH_AVAILABLE" = true ]; then
    echo "Step 3: Setting GitHub secrets..."
    
    read -p "Do you want to set GitHub secrets automatically? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gh secret set AWS_ACCESS_KEY_ID --body "$AWS_KEY"
        gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET"
        gh secret set S3_BUCKET_NAME --body "$WEB_BUCKET"
        gh secret set CLOUDFRONT_DISTRIBUTION_ID --body "$CF_DIST_ID"
        gh secret set API_BASE_URL --body "$API_URL"
        gh secret set WS_URL --body "$WS_URL"
        
        echo -e "${GREEN}✓ GitHub secrets set${NC}"
    fi
else
    echo "Step 3: Manual GitHub secrets setup required"
    echo ""
    echo "Please add these secrets to your GitHub repository:"
    echo "(Settings → Secrets and variables → Actions → New repository secret)"
    echo ""
    echo "AWS_ACCESS_KEY_ID=$AWS_KEY"
    echo "AWS_SECRET_ACCESS_KEY=$AWS_SECRET"
    echo "S3_BUCKET_NAME=$WEB_BUCKET"
    echo "CLOUDFRONT_DISTRIBUTION_ID=$CF_DIST_ID"
    echo "API_BASE_URL=$API_URL"
    echo "WS_URL=$WS_URL"
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

