#!/bin/bash

set -e

echo "========================================="
echo "Update GitHub Workflow with IAM Role ARN"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if terraform is available
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

# Get role ARN from Terraform
cd terraform
ROLE_ARN=$(terraform output -raw github_actions_role_arn 2>/dev/null)

if [ -z "$ROLE_ARN" ] || [ "$ROLE_ARN" == "Not configured - set github_repository variable" ]; then
    echo -e "${RED}❌ GitHub OIDC not configured${NC}"
    echo ""
    echo "To configure:"
    echo "1. Edit terraform/terraform.tfvars"
    echo "2. Set: github_repository = \"yourusername/reponame\""
    echo "3. Run: terraform apply"
    exit 1
fi

echo -e "${GREEN}✓ Found role ARN: $ROLE_ARN${NC}"
echo ""

# Get secret name
SECRET_NAME=$(terraform output -raw secrets_manager_secret_name 2>/dev/null)

# Update workflow file
WORKFLOW_FILE="../.github/workflows/deploy.yml"

if [ ! -f "$WORKFLOW_FILE" ]; then
    echo -e "${RED}❌ Workflow file not found: $WORKFLOW_FILE${NC}"
    exit 1
fi

# Backup original
cp "$WORKFLOW_FILE" "$WORKFLOW_FILE.backup"

# Update the AWS_ROLE_ARN line
if grep -q "AWS_ROLE_ARN:" "$WORKFLOW_FILE"; then
    sed -i.tmp "s|AWS_ROLE_ARN:.*|AWS_ROLE_ARN: '$ROLE_ARN'  # Auto-updated by update-workflow-role-arn.sh|" "$WORKFLOW_FILE"
    rm "$WORKFLOW_FILE.tmp" 2>/dev/null || true
    
    echo -e "${GREEN}✓ Updated AWS_ROLE_ARN${NC}"
else
    echo -e "${YELLOW}⚠️  Could not find AWS_ROLE_ARN in workflow file${NC}"
    echo "Please manually add this line to the env section:"
    echo "  AWS_ROLE_ARN: '$ROLE_ARN'"
fi

# Update secret name if needed
if [ -n "$SECRET_NAME" ] && grep -q "AWS_SECRET_NAME:" "$WORKFLOW_FILE"; then
    sed -i.tmp "s/AWS_SECRET_NAME: '.*'/AWS_SECRET_NAME: '$SECRET_NAME'/" "$WORKFLOW_FILE"
    rm "$WORKFLOW_FILE.tmp" 2>/dev/null || true
    echo -e "${GREEN}✓ Updated AWS_SECRET_NAME${NC}"
fi

echo ""
echo "Backup saved at: $WORKFLOW_FILE.backup"
echo ""

# Show what changed
echo "Changes made:"
echo "  AWS_ROLE_ARN: '$ROLE_ARN'"
if [ -n "$SECRET_NAME" ]; then
    echo "  AWS_SECRET_NAME: '$SECRET_NAME'"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Update Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff .github/workflows/deploy.yml"
echo "2. Remove old GitHub secrets (if any):"
echo "   gh secret delete AWS_ACCESS_KEY_ID"
echo "   gh secret delete AWS_SECRET_ACCESS_KEY"
echo "3. Commit and push:"
echo "   git add .github/workflows/deploy.yml"
echo "   git commit -m 'Setup GitHub OIDC for AWS'"
echo "   git push"

