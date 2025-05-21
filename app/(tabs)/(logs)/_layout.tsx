import { HeaderBackButton } from '@/components/ui/header-back-button';
import { HeaderTitle } from '@/components/ui/header-title';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useHeaderConfig } from '@/hooks/use-header-config';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function Layout() {
  const breakpoints = useBreakpoints();
  const headerConfig = useHeaderConfig();

  return (
    <Stack screenOptions={headerConfig}>
      <Stack.Screen
        name="index"
        options={{
          headerLeft: () =>
            breakpoints.md ? null : <View className="size-12" />,
          headerTitle: () => <HeaderTitle>Logs</HeaderTitle>,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          animation: 'none',
          headerShown: false,
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          animation: 'none',
          headerShown: false,
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen
        name="[id]/delete"
        options={{
          animation: 'none',
          headerShown: false,
          presentation: 'transparentModal',
        }}
      />
    </Stack>
  );
}
