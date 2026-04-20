const { getDefaultConfig } = require('expo/metro-config');
const reanimated = require('react-native-reanimated/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const expoConfig = getDefaultConfig(__dirname);

expoConfig.transformer.getTransformOptions = () => ({
  transform: { experimentalImportSupport: true, inlineRequires: true },
});

expoConfig.transformer.minifierConfig = {
  compress: { drop_console: true },
};

const withReanimatedConfig =
  reanimated.wrapWithReanimatedMetroConfig(expoConfig);

module.exports = withUniwindConfig(withReanimatedConfig, {
  cssEntryFile: './theme/global.css',
  dtsFile: './uniwind-types.d.ts',
  polyfills: { rem: 17 },
});
