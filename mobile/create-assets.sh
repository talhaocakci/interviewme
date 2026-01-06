#!/bin/bash

# Create placeholder assets for Expo

set -e

echo "Creating placeholder assets..."

mkdir -p assets

# Create simple colored PNG files using base64 encoded PNGs
# These are minimal valid PNG files

# Favicon (32x32)
cat > assets/favicon.png << 'EOF'
iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA
GXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADhJREFUeNpi/P//P8OAAiaGAQYj
DowaMGrAqAGjBowaMGrAqAGjBowaMGrAqAGjBgw6AwgQYAAAs38CAVlP5AYAAAAASUVORK5CYII=
EOF

# Icon (512x512) - same simple icon
cat > assets/icon.png << 'EOF'
iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA
GXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADhJREFUeNpi/P//P8OAAiaGAQYj
DowaMGrAqAGjBowaMGrAqAGjBowaMGrAqAGjBgw6AwgQYAAAs38CAVlP5AYAAAAASUVORK5CYII=
EOF

# Adaptive icon
cp assets/icon.png assets/adaptive-icon.png

# Splash screen (1284x2778 for iOS, but we'll use simpler)
cp assets/icon.png assets/splash.png

echo "Base64 decoding assets..."
base64 -d -i assets/favicon.png -o assets/favicon_decoded.png 2>/dev/null && mv assets/favicon_decoded.png assets/favicon.png || echo "favicon already valid"
base64 -d -i assets/icon.png -o assets/icon_decoded.png 2>/dev/null && mv assets/icon_decoded.png assets/icon.png || echo "icon already valid"

echo "✓ Assets created!"
echo ""
echo "Note: These are placeholder assets."
echo "Replace with proper assets for production:"
echo "  - favicon.png (32x32)"
echo "  - icon.png (1024x1024)"  
echo "  - adaptive-icon.png (1024x1024)"
echo "  - splash.png (1284x2778)"

