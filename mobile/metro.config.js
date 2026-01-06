const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Platform extensions for Metro to resolve
config.resolver.sourceExts = [...config.resolver.sourceExts, 'native.ts', 'native.tsx'];

// Add web-specific resolver configuration
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Directly exclude react-native-webrtc package on web
  if (platform === 'web' && moduleName === 'react-native-webrtc') {
    return {
      type: 'empty',
    };
  }

  // Exclude other native-only modules on web
  if (platform === 'web') {
    const excludedModules = [
      'react-native-webrtc',
      '@react-native-community/netinfo',
    ];
    
    if (excludedModules.some(excluded => moduleName === excluded || moduleName.startsWith(excluded + '/'))) {
      return {
        type: 'empty',
      };
    }
    
    // Handle missing PermissionsAndroid
    if (moduleName.includes('PermissionsAndroid')) {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'web-mocks/PermissionsAndroid.js'),
      };
    }
  }
  
  // Ignore missing asset files
  if (moduleName.includes('./assets/') || moduleName.includes('assets/')) {
    try {
      return context.resolveRequest(context, moduleName, platform);
    } catch (error) {
      return {
        type: 'empty',
      };
    }
  }
  
  // Use default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// Disable asset validation errors
config.transformer = {
  ...config.transformer,
  assetPlugins: [],
};

module.exports = config;

