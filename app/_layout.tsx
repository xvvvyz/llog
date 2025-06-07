import { SheetManagerProvider } from '@/context/sheet-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/theme/global.css';
import { NAVIGATION } from '@/theme/navigation';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  return (
    <ThemeProvider value={NAVIGATION[useColorScheme()]}>
      <SheetManagerProvider>
        <GestureHandlerRootView className="flex-1 bg-background">
          <Slot />
          <PortalHost />
        </GestureHandlerRootView>
      </SheetManagerProvider>
    </ThemeProvider>
  );
}
