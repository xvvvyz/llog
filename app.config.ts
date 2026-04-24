import type { ExpoConfig } from 'expo/config';

const { NATIVE_ADAPTIVE_ICON_BACKGROUND, NATIVE_SPLASH_BACKGROUNDS } =
  require('./theme/native.cjs') as {
    NATIVE_ADAPTIVE_ICON_BACKGROUND: string;
    NATIVE_SPLASH_BACKGROUNDS: { light: string; dark: string };
  };

const config: { expo: ExpoConfig } = {
  expo: {
    name: 'llog',
    slug: 'llog',
    version: '0.0.1',
    platforms: ['ios', 'android', 'web'],
    scheme: 'llog',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    ios: { bundleIdentifier: 'co.xvyz.llog', icon: './assets/ios-icon.png' },
    android: {
      icon: './assets/android-icon.png',
      adaptiveIcon: {
        foregroundImage: './assets/android-adaptive-icon-foreground.png',
        backgroundColor: NATIVE_ADAPTIVE_ICON_BACKGROUND,
        monochromeImage: './assets/android-adaptive-icon-monochrome.png',
      },
      package: 'co.xvyz.llog',
      softwareKeyboardLayoutMode: 'pan',
    },
    web: { bundler: 'metro', output: 'single', outputDirectory: 'web' },
    plugins: [
      'expo-router',
      'expo-image-picker',
      'expo-document-picker',
      [
        'expo-splash-screen',
        {
          backgroundColor: NATIVE_SPLASH_BACKGROUNDS.light,
          image: './assets/splash-icon.png',
          imageWidth: 120,
          dark: {
            backgroundColor: NATIVE_SPLASH_BACKGROUNDS.dark,
            image: './assets/splash-icon-dark.png',
          },
        },
      ],
    ],
    experiments: { typedRoutes: true },
  },
};

export default config;
