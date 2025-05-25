import { BackButton } from '@/components/ui/back-button';
import { Title } from '@/components/ui/title';
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
          headerTitle: () => <Title>Logs</Title>,
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}
