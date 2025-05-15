import '@/themes/global.css';
import { NAVIGATION_THEME } from '@/themes/navigation';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import * as React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ThemeProvider value={NAVIGATION_THEME[colorScheme]}>
      <SafeAreaProvider>
        <Slot />
        <PortalHost />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
