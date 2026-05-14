module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      './babel-preset-nativewind',
    ],
    plugins: [
      'react-native-reanimated/plugin', // deve ser o último plugin
    ],
  };
};
