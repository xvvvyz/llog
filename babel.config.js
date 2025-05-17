module.exports = function (api) {
  api.cache(true);

  return {
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
    plugins: [
      '@babel/plugin-proposal-export-namespace-from',
      'react-native-reanimated/plugin',
    ],
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
