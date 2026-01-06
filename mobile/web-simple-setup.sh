#!/bin/bash

# Simple web setup - creates minimal assets

set -e

echo "Creating minimal web assets..."

mkdir -p assets

# Create a simple 1x1 pixel PNG (smallest valid PNG)
# This is enough for Expo to work
printf '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x20\x00\x00\x00\x20\x08\x02\x00\x00\x00\xfc\x18\xed\xa3\x00\x00\x00\x0c\x49\x44\x41\x54\x78\x9c\x63\x00\x01\x00\x00\x05\x00\x01\x0d\x0a\x2d\xb4\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > assets/favicon.png

# Copy for all required assets
cp assets/favicon.png assets/icon.png
cp assets/favicon.png assets/splash.png
cp assets/favicon.png assets/adaptive-icon.png

echo "✓ Minimal assets created!"
echo ""
echo "Assets created:"
echo "  - assets/favicon.png"
echo "  - assets/icon.png"
echo "  - assets/splash.png"
echo "  - assets/adaptive-icon.png"
echo ""
echo "These are minimal placeholders. For production, replace with real images."

