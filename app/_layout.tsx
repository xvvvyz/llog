import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/theme/global.css';
import { NAVIGATION } from '@/theme/navigation';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={NAVIGATION[colorScheme]}>
      <SafeAreaProvider>
        <GestureHandlerRootView>
          <View className="flex-1 bg-background">
            <Slot />
            <PortalHost />
          </View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
