import { SheetManagerProvider } from '@/context/sheet-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/theme/global.css';
import { NAVIGATION } from '@/theme/navigation';
import NetInfo from '@react-native-community/netinfo';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

NetInfo.configure({ reachabilityShouldRun: () => false });

export default function Layout() {
  return (
    <ThemeProvider value={NAVIGATION[useColorScheme()]}>
      <SheetManagerProvider>
        <GestureHandlerRootView>
          <View className="flex-1 bg-background">
            <Slot />
            <PortalHost />
          </View>
        </GestureHandlerRootView>
      </SheetManagerProvider>
    </ThemeProvider>
  );
}
