const metro = require('expo/metro-config');
const nativeWind = require('nativewind/metro');
const reanimated = require('react-native-reanimated/metro-config');

const expoConfig = metro.getDefaultConfig(__dirname);

expoConfig.transformer.minifierConfig = { compress: { drop_console: true } };

const withNativeWindConfig = nativeWind.withNativeWind(expoConfig, {
  input: './theme/global.css',
  inlineRem: 17,
});

const withReanimatedConfig =
  reanimated.wrapWithReanimatedMetroConfig(withNativeWindConfig);

module.exports = withReanimatedConfig;
