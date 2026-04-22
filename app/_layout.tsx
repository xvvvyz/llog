import * as push from '@/features/account/lib/web-push';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SheetManagerProvider } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import '@/theme/global.css';
import { UI } from '@/theme/ui';
import { configure as configureNetInfo } from '@react-native-community/netinfo';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import { setBackgroundColorAsync } from 'expo-system-ui';
import * as React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

configureNetInfo({ reachabilityShouldRun: () => false });
setBackgroundColorAsync('transparent');

// react-native-gesture-handler on web throws "Cannot find single active touch"
// when a pointer is released outside an active gesture. It is benign (no state
// corruption, no missed events) but surfaces as a fatal uncaught error that
// breaks the dev overlay. Filter it from the console and global handler until
// the upstream fix lands.
const SINGLE_ACTIVE_TOUCH_ERROR = 'Cannot find single active touch';

const isSingleActiveTouchError = (value: unknown) => {
  if (typeof value === 'string') {
    return value.includes(SINGLE_ACTIVE_TOUCH_ERROR);
  }

  if (value instanceof Error) {
    return value.message.includes(SINGLE_ACTIVE_TOUCH_ERROR);
  }

  return false;
};

if (Platform.OS === 'web') {
  const globalScope = globalThis as typeof globalThis & {
    __llogSingleActiveTouchGuardInstalled?: boolean;

    ErrorUtils?: {
      getGlobalHandler?: () => (error: unknown, isFatal: boolean) => void;
      setGlobalHandler?: (
        handler: (error: unknown, isFatal: boolean) => void
      ) => void;
    };
  };

  if (!globalScope.__llogSingleActiveTouchGuardInstalled) {
    globalScope.__llogSingleActiveTouchGuardInstalled = true;
    const originalConsoleError = console.error.bind(console);

    console.error = (...args) => {
      if (args.some(isSingleActiveTouchError)) return;
      originalConsoleError(...args);
    };

    const getGlobalHandler = globalScope.ErrorUtils?.getGlobalHandler;
    const setGlobalHandler = globalScope.ErrorUtils?.setGlobalHandler;

    if (getGlobalHandler && setGlobalHandler) {
      const originalGlobalHandler = getGlobalHandler();

      setGlobalHandler((error, isFatal) => {
        if (isSingleActiveTouchError(error)) return;
        originalGlobalHandler(error, isFatal);
      });
    }
  }
}

export default function Layout() {
  const auth = db.useAuth();
  const colorScheme = useColorScheme();
  const userId = auth.user?.id;

  React.useEffect(() => {
    setBackgroundColorAsync(UI[colorScheme].background);
  }, [colorScheme]);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;

    void (async () => {
      try {
        await push.registerWebPushServiceWorker();
      } catch (error) {
        console.error('Failed to register service worker', error);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !userId) return;

    void (async () => {
      try {
        await push.syncWebPushSubscription();
      } catch (error) {
        console.error('Failed to sync web push subscription', error);
      }
    })();
  }, [userId]);

  return (
    <React.Fragment>
      <ThemeProvider
        value={{
          dark: colorScheme === 'dark',
          colors: {
            background: UI[colorScheme].background,
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
