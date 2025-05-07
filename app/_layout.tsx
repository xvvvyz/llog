import '@/global.css';
import { AuthProvider } from '@/lib/auth';
import { NAV_THEME } from '@/lib/constants';
import { useColorScheme } from '@/lib/useColorScheme';
import * as Navigation from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';

const LIGHT_THEME: Navigation.Theme = {
  ...Navigation.DefaultTheme,
  colors: NAV_THEME.light,
};

const DARK_THEME: Navigation.Theme = {
  ...Navigation.DarkTheme,
  colors: NAV_THEME.dark,
};

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <Navigation.ThemeProvider
      value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}
    >
      <StatusBar style={isDarkColorScheme ? 'dark' : 'light'} />
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </Navigation.ThemeProvider>
  );
}
