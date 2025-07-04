import { SheetManagerProvider } from '@/context/sheet-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/theme/global.css';
import { UI } from '@/theme/ui';
import { configure as configureNetInfo } from '@react-native-community/netinfo';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { Fragment, useEffect } from 'react';
import { Platform } from 'react-native';

configureNetInfo({ reachabilityShouldRun: () => false });
setBackgroundColorAsync('transparent');

export default function Layout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setBackgroundColorAsync(UI[colorScheme].background);
  }, [colorScheme]);

  return (
    <Fragment>
      {Platform.OS === 'web' && (
        <Head>
          <title>llog</title>
          <meta name="color-scheme" content="light dark" />
          <meta name="description" content="Track anything in your world." />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, shrink-to-fit=no, interactive-widget=resizes-content, user-scalable=no"
          />
        </Head>
      )}
      <ThemeProvider
        value={{
          colors: {
            background: 'transparent',
            border: 'transparent',
            card: 'transparent',
            notification: 'transparent',
            primary: 'transparent',
            text: 'transparent',
          },
          dark: colorScheme === 'dark',
          fonts: DefaultTheme.fonts,
        }}
      >
        <SheetManagerProvider>
          <Slot />
          <PortalHost />
        </SheetManagerProvider>
      </ThemeProvider>
    </Fragment>
  );
}
