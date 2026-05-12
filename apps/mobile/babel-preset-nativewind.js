// Replicates nativewind/babel but omits react-native-worklets/plugin
// (we use reanimated v3, not v4, so worklets plugin is not needed)
module.exports = function () {
  return {
    plugins: [
      require('react-native-css-interop/dist/babel-plugin').default,
      [
        '@babel/plugin-transform-react-jsx',
        {
          runtime: 'automatic',
          importSource: 'react-native-css-interop',
        },
      ],
    ],
  };
};
