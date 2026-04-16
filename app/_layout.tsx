import { useColorScheme } from '@/hooks/use-color-scheme';
import { SheetManagerProvider } from '@/hooks/use-sheet-manager';
import '@/theme/global.css';
import { UI } from '@/theme/ui';
import { db } from '@/utilities/db';
import { setFileAccessToken } from '@/utilities/file-access-token';
import * as wp from '@/utilities/web-push';
import { configure as configureNetInfo } from '@react-native-community/netinfo';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { cssInterop } from 'nativewind';
import * as React from 'react';
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

LogBox.ignoreLogs(['Cannot find single active touch']);

if (__DEV__ && Platform.OS === 'web') {
  const origError = console.error;

  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Cannot find single active touch')
    ) {
      return;
    }

    origError.apply(console, args);
  };
}

cssInterop(Animated.View, { className: 'style' });
configureNetInfo({ reachabilityShouldRun: () => false });
setBackgroundColorAsync('transparent');

export default function Layout() {
  const auth = db.useAuth();
  const colorScheme = useColorScheme();
  const userId = auth.user?.id;

  React.useEffect(() => {
    setBackgroundColorAsync(UI[colorScheme].background);
  }, [colorScheme]);

  React.useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setFileAccessToken(null);
      return;
    }

    db.getAuth().then((resolvedAuth) => {
      if (!cancelled) {
        setFileAccessToken(resolvedAuth?.refresh_token ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;

    wp.registerWebPushServiceWorker().catch((error) => {
      console.error('Failed to register service worker', error);
    });
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !userId) return;

    wp.syncWebPushSubscription().catch((error) => {
      console.error('Failed to sync web push subscription', error);
    });
  }, [userId]);

  return (
    <React.Fragment>
      {Platform.OS === 'web' && (
        <Head>
          <meta name="theme-color" content={UI[colorScheme].background} />
        </Head>
      )}
      <ThemeProvider
        value={{
          dark: colorScheme === 'dark',
          colors: {
            background: 'transparent',
            border: 'transparent',
            card: 'transparent',
            notification: 'transparent',
            primary: 'transparent',
            text: 'transparent',
          },
          fonts: DefaultTheme.fonts,
        }}
      >
        <GestureHandlerRootView className="flex-1">
          <SheetManagerProvider>
            <Slot />
            <PortalHost />
          </SheetManagerProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </React.Fragment>
  );
}
