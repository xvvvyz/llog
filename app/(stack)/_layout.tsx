import { HeaderBackButton } from '@/components/ui/header-back-button';
import { Loading } from '@/components/ui/loading';
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
      }}
    >
      <Stack.Screen
        name="new"
        options={{
          animation: 'none',
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen
        name="[id]/delete"
        options={{
          animation: 'none',
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          animation: 'none',
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => <HeaderBackButton />,
          headerShown: true,
        }}
      />
    </Stack>
  );
}
