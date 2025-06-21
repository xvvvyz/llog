import { SheetManagerProvider } from '@/context/sheet-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/theme/global.css';
import NetInfo from '@react-native-community/netinfo';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { Platform, View } from 'react-native';

NetInfo.configure({ reachabilityShouldRun: () => false });

export default function Layout() {
  const colorScheme = useColorScheme();

  return (
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
      {Platform.OS === 'web' && (
        <Head>
          <title>llog</title>
          <meta name="description" content="Track anything in your world." />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, shrink-to-fit=no, interactive-widget=resizes-content, user-scalable=no"
          />
          <meta name="color-scheme" content="light dark" />
        </Head>
      )}
      <SheetManagerProvider>
        <View className="flex-1 bg-background">
          <Slot />
          <PortalHost />
        </View>
      </SheetManagerProvider>
    </ThemeProvider>
  );
}
