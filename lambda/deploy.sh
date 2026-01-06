#!/bin/bash

# Deploy Lambda Functions

set -e

echo "======================================"
echo "Deploying Lambda Functions"
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create package directory
mkdir -p ./package

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"

# Use Python 3.11 (Lambda runtime)
PYTHON_CMD="python3.11"

# Fallback to python3 if 3.11 not available
if ! command -v python3.11 &> /dev/null; then
    echo -e "${YELLOW}Python 3.11 not found, using python3${NC}"
    PYTHON_CMD="python3"
fi

# Try container build first (most reliable)
CONTAINER_CMD=""
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
fi

if [ -n "$CONTAINER_CMD" ]; then
    echo -e "${BLUE}Building with $CONTAINER_CMD (100% Lambda compatible)...${NC}"
    $CONTAINER_CMD run --rm \
      --platform linux/amd64 \
      --entrypoint "" \
      -v "$PWD":/var/task:z \
      public.ecr.aws/lambda/python:3.11 \
      pip install -r requirements.txt -t /var/task/package --no-cache-dir
else
    echo -e "${YELLOW}Container runtime not found, using local Python...${NC}"
    # Install with prefer binary to avoid compilation
    $PYTHON_CMD -m pip install --upgrade pip setuptools wheel -q
    $PYTHON_CMD -m pip install -r requirements.txt -t ./package --only-binary :all: 2>/dev/null || \
    $PYTHON_CMD -m pip install -r requirements.txt -t ./package
fi

# Auth Lambda
echo -e "${BLUE}Packaging Auth Lambda...${NC}"
rm -f auth.zip
cd package
zip -r ../auth.zip . -x "*.pyc" -x "__pycache__/*" -x "*.dist-info/*"
cd ..
cd auth
zip -g ../auth.zip handler.py
cd ..

# Chat Lambda
echo -e "${BLUE}Packaging Chat Lambda...${NC}"
rm -f chat.zip
cd package
zip -r ../chat.zip . -x "*.pyc" -x "__pycache__/*" -x "*.dist-info/*"
cd ..
cd chat
zip -g ../chat.zip handler.py
cd ..

# Room Lambda
echo -e "${BLUE}Packaging Room Lambda...${NC}"
rm -f room.zip
cd package
zip -r ../room.zip . -x "*.pyc" -x "__pycache__/*" -x "*.dist-info/*"
cd ..
cd room
zip -g ../room.zip handler.py
cd ..

# WebSocket Lambda
echo -e "${BLUE}Packaging WebSocket Lambda...${NC}"
rm -f websocket.zip
cd package
zip -r ../websocket.zip . -x "*.pyc" -x "__pycache__/*" -x "*.dist-info/*"
cd ..
cd websocket
zip -g ../websocket.zip handler.py room_handler.py
cd ..

echo -e "${GREEN}✓ Lambda functions packaged${NC}"
echo ""
echo "Now run: cd ../terraform && terraform apply"

