module.exports =
  require('react-native-reanimated/metro-config').wrapWithReanimatedMetroConfig(
    require('nativewind/metro').withNativeWind(
      require('expo/metro-config').getDefaultConfig(__dirname),
      { input: './theme/global.css', inlineRem: 17 }
    )
  );
