import { HeaderBackButton } from '@/components/header-back-button';
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerShown: false,
        headerTitleAlign: 'center',
        presentation: 'transparentModal',
      }}
    >
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]/delete" options={{ animation: 'fade' }} />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen
        name="[id]/index"
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <HeaderBackButton />,
          headerShown: true,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
