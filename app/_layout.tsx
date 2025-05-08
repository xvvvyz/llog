import '@/global.css';
import { NAV_THEME } from '@/lib/constants';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as React from 'react';
import { useColorScheme } from 'react-native';

export default function Layout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'dark']}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
