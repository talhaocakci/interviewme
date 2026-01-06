#!/bin/bash

# Fix web bundler issues

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   Fixing Web Bundler Issues${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Step 1: Stop any running Metro instances
echo -e "${YELLOW}Stopping Metro bundler...${NC}"
pkill -f "react-native" || true
pkill -f "expo" || true
sleep 2

# Step 2: Clear all caches
echo -e "${YELLOW}Clearing caches...${NC}"
rm -rf .expo
rm -rf node_modules/.cache
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Step 3: Clear Metro cache
echo -e "${YELLOW}Clearing Metro bundler cache...${NC}"
npx expo start --clear || true

# Step 4: Reinstall dependencies if needed
if [ "$1" == "--reinstall" ]; then
    echo -e "${YELLOW}Reinstalling dependencies...${NC}"
    rm -rf node_modules
    npm install --legacy-peer-deps
    npx expo install react-native-web@~0.19.6 react-dom@18.2.0 -- --yes
fi

echo ""
echo -e "${GREEN}✓ Caches cleared!${NC}"
echo ""
echo "Now start the app:"
echo -e "${BLUE}npm start -- --clear${NC}"
echo ""
echo "Or run web directly:"
echo -e "${BLUE}npm run web${NC}"

