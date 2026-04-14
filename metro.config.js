const metro = require('expo/metro-config');
const nativeWind = require('nativewind/metro');
const reanimated = require('react-native-reanimated/metro-config');

const expoConfig = metro.getDefaultConfig(__dirname);
const originalResolveRequest = expoConfig.resolver?.resolveRequest;

expoConfig.resolver = {
  ...expoConfig.resolver,
  resolveRequest(context, moduleName, platform) {
    if (moduleName === 'uc.micro') {
      return context.resolveRequest(
        context,
        'uc.micro/build/index.cjs.js',
        platform
      );
    }

    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
  },
};

expoConfig.transformer.getTransformOptions = () => ({
  transform: { experimentalImportSupport: true, inlineRequires: true },
});

expoConfig.transformer.minifierConfig = {
  compress: { drop_console: true },
};

const withNativeWindConfig = nativeWind.withNativeWind(expoConfig, {
  input: './theme/global.css',
  inlineRem: 17,
});

const withReanimatedConfig =
  reanimated.wrapWithReanimatedMetroConfig(withNativeWindConfig);

module.exports = withReanimatedConfig;
