import { Plus } from '@/components/icons/plus';
import { Button } from '@/components/ui/button';
import { HeaderBackButton } from '@/components/ui/header-back-button';
import { HeaderTitle } from '@/components/ui/header-title';
import { Loading } from '@/components/ui/loading';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Link, Redirect, Stack, usePathname } from 'expo-router';

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
        headerShadowVisible: false,
        headerShown: false,
        headerTitleAlign: 'center',
      }}
    >
      {/* move header config to (tabs)/_layout.tsx when this issue is fixed
          https://github.com/react-navigation/react-navigation/issues/11295 */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerRight:
            { '/settings': () => null }[pathname] ??
            (() => (
              <Link asChild href="/new">
                <Button className="size-12" size="icon" variant="link">
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
