import '@/global.css';
import { AuthProvider } from '@/lib/auth';
import { NAV_THEME } from '@/lib/constants';
import { useColorScheme } from '@/lib/useColorScheme';
import * as Navigation from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';

export default function Layout() {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <Navigation.ThemeProvider
      value={
        isDarkColorScheme
          ? { ...Navigation.DarkTheme, colors: NAV_THEME.dark }
          : { ...Navigation.DefaultTheme, colors: NAV_THEME.light }
      }
    >
      <StatusBar style={isDarkColorScheme ? 'dark' : 'light'} />
      <View className="h-screen bg-background">
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </View>
    </Navigation.ThemeProvider>
  );
}
