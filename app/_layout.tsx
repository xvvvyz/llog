import '@/themes/global.css';
import { NAVIGATION_THEME } from '@/themes/navigation';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import * as React from 'react';
import { useEffect } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  const colorScheme = useColorScheme() ?? 'light';

  useEffect(() => {
    if (Platform.OS === 'web') {
      // prevent white background on overscroll
      document.documentElement.classList.add('bg-background');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={NAVIGATION_THEME[colorScheme]}>
        <GestureHandlerRootView>
          <View className="flex-1 bg-background">
            <Slot />
          </View>
          <PortalHost />
        </GestureHandlerRootView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
