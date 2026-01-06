#!/bin/bash

set -e

echo "========================================="
echo "Securely Set GitHub Secrets"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

# Get credentials from Terraform (without displaying)
cd terraform

echo "Fetching AWS credentials from Terraform..."
AWS_KEY=$(terraform output -raw iam_access_key_id 2>/dev/null)
AWS_SECRET=$(terraform output -raw iam_secret_access_key 2>/dev/null)

if [ -z "$AWS_KEY" ] || [ -z "$AWS_SECRET" ]; then
    echo -e "${RED}❌ Could not retrieve credentials from Terraform${NC}"
    echo "Make sure you have run 'terraform apply' first"
    exit 1
fi

echo -e "${GREEN}✓ Credentials retrieved${NC}"
echo ""

# Show only partial key for verification
echo "AWS Access Key ID: ******************${AWS_KEY: -4}"
echo ""

read -p "Set these credentials as GitHub secrets? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Setting GitHub secrets..."

# Set secrets without showing them
gh secret set AWS_ACCESS_KEY_ID --body "$AWS_KEY" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ AWS_ACCESS_KEY_ID set${NC}"
else
    echo -e "${RED}❌ Failed to set AWS_ACCESS_KEY_ID${NC}"
    exit 1
fi

gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ AWS_SECRET_ACCESS_KEY set${NC}"
else
    echo -e "${RED}❌ Failed to set AWS_SECRET_ACCESS_KEY${NC}"
    exit 1
fi

# Clear variables from memory
AWS_KEY=""
AWS_SECRET=""

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}GitHub Secrets Set Successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Your AWS credentials are now stored securely in GitHub."
echo "They were never displayed in plain text."
echo ""
echo "Next steps:"
echo "1. Verify secrets: gh secret list"
echo "2. Push code to trigger deployment"

