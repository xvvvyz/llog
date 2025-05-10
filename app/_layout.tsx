import '@/global.css';
import { NAV_THEME } from '@/lib/constants';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import * as React from 'react';
import { Platform, useColorScheme, View } from 'react-native';

export default function Layout() {
  const colorScheme = useColorScheme() ?? 'light';

  React.useLayoutEffect(() => {
    if (Platform.OS === 'web') {
      // prevent white background on overscroll
      document.documentElement.classList.add('bg-background');
    }
  }, []);

  return (
    <ThemeProvider value={NAV_THEME[colorScheme]}>
      <View className="h-full bg-background">
        <View className="h-full web:mx-auto web:w-full web:max-w-md">
          <Slot />
          <PortalHost />
        </View>
      </View>
    </ThemeProvider>
  );
}
