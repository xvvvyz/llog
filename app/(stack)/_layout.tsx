import { Plus } from '@/components/icons/plus';
import { Button } from '@/components/ui/button';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { HeaderTitle } from '@/components/ui/header-title';
import { Loading } from '@/components/ui/loading';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Link, Redirect, Stack, usePathname } from 'expo-router';
import { View } from 'react-native';

export default function Layout() {
  const onboarding = useOnboarding();
  const pathname = usePathname();

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
        headerBackVisible: false,
        headerShadowVisible: false,
        headerShown: false,
        headerTitleAlign: 'center',
        title: '',
      }}
    >
      {/* this config should be in (tabs)/_layout.tsx but...
          https://github.com/react-navigation/react-navigation/issues/11295 */}
      <Stack.Screen
        name="(tabs)"
        options={{
          // render empty space to prevent off center header titles (see header-title.tsx)
          headerLeft:
            { '/settings': () => null }[pathname] ??
            (() => <View className="size-12" />),
          headerRight:
            {
              '/settings': () => null,
            }[pathname] ??
            (() => (
              <Link asChild href="/new">
                <Button className="size-12 web:mr-4" size="icon" variant="link">
                  <Plus className="color-foreground" />
                </Button>
              </Link>
            )),
          headerShown: true,
          headerTitle: () => (
            <HeaderTitle>
              {{ '/settings': 'Settings' }[pathname] ?? 'Logs'}
            </HeaderTitle>
          ),
        }}
      />
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
          headerLeft: () => <HeaderBackButton />,
          headerShown: true,
        }}
      />
    </Stack>
  );
}
