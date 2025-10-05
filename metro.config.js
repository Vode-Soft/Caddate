const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// React Native'in VirtualView.js dosyasını ignore et
config.resolver = {
  ...config.resolver,
  blacklistRE: /node_modules\/react-native\/src\/private\/components\/virtualview\/VirtualView\.js$/,
  // Alternative: exclude the entire virtualview directory
  blockList: [
    /node_modules\/react-native\/src\/private\/components\/virtualview\/.*/,
  ],
};

// Transform ignore patterns
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;
