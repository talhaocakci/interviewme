#!/bin/bash

set -e

echo "========================================="
echo "Update GitHub Workflow Secret Name"
echo "========================================="
echo ""

# Check if terraform is available
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed"
    exit 1
fi

# Get secret name from Terraform
cd terraform
SECRET_NAME=$(terraform output -raw secrets_manager_secret_name 2>/dev/null)

if [ -z "$SECRET_NAME" ]; then
    echo "❌ Could not get secret name from Terraform"
    echo "   Make sure you have run 'terraform apply' first"
    exit 1
fi

echo "✓ Found secret name: $SECRET_NAME"
echo ""

# Update workflow file
WORKFLOW_FILE="../.github/workflows/deploy.yml"

if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi

# Update the AWS_SECRET_NAME line
if grep -q "AWS_SECRET_NAME:" "$WORKFLOW_FILE"; then
    # Backup original
    cp "$WORKFLOW_FILE" "$WORKFLOW_FILE.backup"
    
    # Update the secret name
    sed -i.tmp "s/AWS_SECRET_NAME: '.*'/AWS_SECRET_NAME: '$SECRET_NAME'/" "$WORKFLOW_FILE"
    rm "$WORKFLOW_FILE.tmp" 2>/dev/null || true
    
    echo "✓ Updated workflow file"
    echo ""
    echo "Changes:"
    echo "  AWS_SECRET_NAME: '$SECRET_NAME'"
    echo ""
    echo "Backup saved at: $WORKFLOW_FILE.backup"
else
    echo "❌ Could not find AWS_SECRET_NAME in workflow file"
    exit 1
fi

echo ""
echo "========================================="
echo "Update Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff .github/workflows/deploy.yml"
echo "2. Commit: git add .github/workflows/deploy.yml && git commit -m 'Update secret name'"
echo "3. Push: git push"

