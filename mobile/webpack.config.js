const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@react-native-async-storage/async-storage'],
      },
    },
    argv
  );

  // Exclude react-native-webrtc from web builds
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native-webrtc': false,
    '@react-native-community/netinfo': false,
  };

  return config;
};

