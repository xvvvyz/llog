import '@/global.css';
import AuthProvider from '@/lib/auth';
import { NAV_THEME } from '@/lib/constants';
import { useColorScheme } from '@/lib/useColorScheme';
import * as Navigation from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform } from 'react-native';

const LIGHT_THEME: Navigation.Theme = {
  ...Navigation.DefaultTheme,
  colors: NAV_THEME.light,
};

const DARK_THEME: Navigation.Theme = {
  ...Navigation.DarkTheme,
  colors: NAV_THEME.dark,
};

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined'
    ? React.useEffect
    : React.useLayoutEffect;

export default function Layout() {
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);
  const hasMounted = React.useRef(false);
  const { isDarkColorScheme } = useColorScheme();

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === 'web') {
      document.documentElement.classList.add('bg-background');
    }

    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <Navigation.ThemeProvider
      value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}
    >
      <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </Navigation.ThemeProvider>
  );
}
