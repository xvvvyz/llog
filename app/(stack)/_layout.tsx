import { HeaderBackButton } from '@/components/header-back-button';
import { Loading } from '@/components/loading';
import { useOnboarding } from '@/utilities/hooks/use-onboarding';
import { Redirect, Stack } from 'expo-router';

export default function Layout() {
  const onboarding = useOnboarding();

  if (onboarding.isLoading) {
    return <Loading />;
  }

  if (onboarding.requiresAuth) {
    return <Redirect href="/sign-in" />;
  }

  if (onboarding.requiresOnboarding) {
    return <Redirect href="/onboarding" />;
  }

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
