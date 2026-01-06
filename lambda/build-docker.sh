#!/bin/bash

# Build Lambda packages using Podman/Docker (no local Python issues!)

set -e

echo "======================================"
echo "Building Lambda with Containers"
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Detect container runtime (prefer podman)
CONTAINER_CMD=""
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
    echo -e "${GREEN}Using Podman${NC}"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    echo -e "${GREEN}Using Docker${NC}"
else
    echo -e "${RED}Neither Podman nor Docker found!${NC}"
    echo ""
    echo "Install Podman (recommended):"
    echo "  macOS: brew install podman"
    echo "  Linux: sudo apt install podman  # or yum install podman"
    echo ""
    echo "Or install Docker:"
    echo "  macOS: brew install --cask docker"
    echo "  Download: https://docker.com/get-started"
    exit 1
fi

echo -e "${BLUE}Building packages in Lambda Python 3.11 environment...${NC}"
echo "This ensures 100% compatibility with AWS Lambda!"
echo ""

# Clean up old packages
rm -rf package
mkdir -p package

# Build using official AWS Lambda Python image
$CONTAINER_CMD run --rm \
  --platform linux/amd64 \
  --entrypoint "" \
  -v "$PWD":/var/task:z \
  public.ecr.aws/lambda/python:3.11 \
  pip install -r requirements.txt -t /var/task/package --no-cache-dir

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Packages built successfully!${NC}"
    
    # Show package size
    PACKAGE_SIZE=$(du -sh package | cut -f1)
    echo "Package size: $PACKAGE_SIZE"
    
    # Package the functions
    echo ""
    echo -e "${BLUE}Creating ZIP files...${NC}"
    
    # Auth Lambda
    cd auth
    cp -r ../package/* . 2>/dev/null || true
    zip -r ../auth.zip . -q -x "*.pyc" -x "__pycache__/*"
    cd ..
    
    # Chat Lambda
    cd chat
    cp -r ../package/* . 2>/dev/null || true
    zip -r ../chat.zip . -q -x "*.pyc" -x "__pycache__/*"
    cd ..
    
    # WebSocket Lambda
    cd websocket
    cp -r ../package/* . 2>/dev/null || true
    zip -r ../websocket.zip . -q -x "*.pyc" -x "__pycache__/*"
    cd ..
    
    echo -e "${GREEN}✓ All Lambda functions packaged!${NC}"
    echo ""
    echo "Created:"
    ls -lh *.zip 2>/dev/null || true
    echo ""
    echo "Next: cd ../terraform && terraform apply"
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

