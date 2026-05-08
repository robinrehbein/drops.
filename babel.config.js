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

  // react-native-reanimated/plugin MUST be last when present.
  // It's added only after Task 31 installs the package — until then, eagerly
  // referencing it breaks jest's babel transform pipeline.
  try {
    require.resolve('react-native-reanimated/plugin');
    plugins.push('react-native-reanimated/plugin');
  } catch {
    // not installed yet — Task 31 will introduce it.
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
