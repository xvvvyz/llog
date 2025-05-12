import '@/themes/global.css';
import { NAVIGATION_THEME } from '@/themes/navigation';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import * as React from 'react';
import { Platform, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  const colorScheme = useColorScheme() ?? 'light';

  React.useLayoutEffect(() => {
    if (Platform.OS === 'web') {
      // prevent white background on overscroll
      document.documentElement.classList.add('bg-background');
    }
  }, []);

  return (
    <View className="flex-1 bg-background">
      <GestureHandlerRootView>
        <ThemeProvider value={NAVIGATION_THEME[colorScheme]}>
          <Slot />
          <PortalHost />
        </ThemeProvider>
      </GestureHandlerRootView>
    </View>
  );
}
