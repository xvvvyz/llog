import { SheetManagerProvider } from '@/context/sheet-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/theme/global.css';
import { NAVIGATION } from '@/theme/navigation';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  return (
    <ThemeProvider value={NAVIGATION[useColorScheme()]}>
      <SafeAreaProvider>
        <GestureHandlerRootView>
          <SheetManagerProvider>
            <BottomSheetModalProvider>
              <Slot />
              <PortalHost />
            </BottomSheetModalProvider>
          </SheetManagerProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
