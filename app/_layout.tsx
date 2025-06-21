import { SheetManagerProvider } from '@/context/sheet-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/theme/global.css';
import { NAVIGATION } from '@/theme/navigation';
import NetInfo from '@react-native-community/netinfo';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { Fragment, useEffect } from 'react';
import { Platform } from 'react-native';

NetInfo.configure({ reachabilityShouldRun: () => false });

export default function Layout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setBackgroundColorAsync(NAVIGATION[colorScheme].colors.background);
  }, [colorScheme]);

  return (
    <Fragment>
      {Platform.OS === 'web' && (
        <Head>
          <title>llog</title>
          <meta name="description" content="Track anything in your world." />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, shrink-to-fit=no, interactive-widget=resizes-content, user-scalable=no"
          />
          <meta name="color-scheme" content="light dark" />
          <meta
            name="theme-color"
            content={NAVIGATION[colorScheme].colors.background}
          />
        </Head>
      )}
      <ThemeProvider value={NAVIGATION[colorScheme]}>
        <SheetManagerProvider>
          <Slot />
          <PortalHost />
        </SheetManagerProvider>
      </ThemeProvider>
    </Fragment>
  );
}
