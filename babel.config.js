module.exports = function (api) {
  api.cache(true);

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: { '@': './src', '@app': './app', '@tests': './tests' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
  ];

  // react-native-worklets/plugin MUST be last when present.
  // Reanimated 4 split its runtime into react-native-worklets and moved the
  // babel plugin to that package. Skia 2 depends on Reanimated 4, which
  // depends on worklets — so as soon as Reanimated is installed, the
  // worklets package is too. We keep both lookups gated so jest doesn't
  // eagerly fail if neither is installed yet.
  try {
    require.resolve('react-native-worklets/plugin');
    plugins.push('react-native-worklets/plugin');
  } catch {
    try {
      // Reanimated 3 fallback (older babel plugin path).
      require.resolve('react-native-reanimated/plugin');
      plugins.push('react-native-reanimated/plugin');
    } catch {
      // neither installed yet — fine for unit tests, fatal for native bundles.
    }
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
