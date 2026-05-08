module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: { '@': './src', '@app': './app', '@tests': './tests' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      }],
      'react-native-reanimated/plugin', // MUST be last
    ],
  };
};
