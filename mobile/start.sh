#!/bin/bash

# Quick start script for mobile app

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   Starting Mobile App${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Dependencies not installed. Installing...${NC}"
    npm install --legacy-peer-deps
    npx expo install react-native-web@~0.19.6 react-dom@18.2.0 -- --yes
fi

# Check if .env exists (never overwrite)
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating default .env file...${NC}"
    cat > .env << 'EOF'
API_BASE_URL=http://localhost:8000
WS_URL=ws://localhost:8000
EOF
    echo -e "${YELLOW}⚠️  Created default .env - update it with your AWS API URLs!${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Using existing .env configuration${NC}"
fi

# Start Expo
echo -e "${GREEN}Starting Expo...${NC}"
echo ""
echo "Press:"
echo "  - 'w' for web browser"
echo "  - 'i' for iOS simulator (Mac only)"
echo "  - 'a' for Android emulator"
echo ""

npm start

