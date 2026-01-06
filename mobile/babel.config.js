module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Load environment variables from .env
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: false,
          allowUndefined: true,
        },
      ],
      // Add platform-specific plugin
      [
        'module-resolver',
        {
          alias: {
            // On web, alias react-native-webrtc to empty module
            'react-native-webrtc': './web-mocks/empty.js',
          },
        },
      ],
    ],
  };
};

