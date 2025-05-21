import { Bell } from '@/components/icons/bell';
import { Bolt } from '@/components/icons/bolt';
import { Scroll } from '@/components/icons/scroll';
import { Button } from '@/components/ui/button';
import { HeaderTitle } from '@/components/ui/header-title';
import { Loading } from '@/components/ui/loading';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useOnboarding } from '@/hooks/use-onboarding';
import { cn } from '@/utilities/cn';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Layout() {
  const breakpoints = useBreakpoints();
  const insets = useSafeAreaInsets();
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
    <Tabs
      screenOptions={{
        animation: 'shift',
        headerShadowVisible: false,
        headerStyle: { borderBottomWidth: breakpoints.md ? 1 : 0 },
        headerTitleAlign: breakpoints.md ? 'left' : 'center',
        tabBarItemStyle: {
          marginBottom: breakpoints.md ? 8 : 0,
          marginTop: 0,
        },
        tabBarPosition: breakpoints.md ? 'left' : 'bottom',
        tabBarShowLabel: false,
        tabBarStyle: {
          marginTop: 0,
          borderRightWidth: breakpoints.md ? 1 : 0,
          borderTopWidth: 0,
          elevation: 0,
          height: breakpoints.md ? undefined : insets.bottom + 60,
          minWidth: 0,
          paddingBottom: breakpoints.md ? 8 : undefined,
          paddingEnd: 8,
          paddingStart: 8,
          paddingTop: 8,
        },
        title: '',
      }}
    >
      <Tabs.Screen
        name="(logs)"
        options={{
          headerShown: false,
          tabBarButton: ({ children, onPress, ...props }) => (
            <Button
              aria-selected={props['aria-selected']}
              className="web:aria-selected:bg-accent"
              onPress={onPress}
              size={breakpoints.md ? 'icon' : 'default'}
              variant="ghost"
            >
              {children}
            </Button>
          ),
          tabBarIcon: ({ focused }) => (
            <Scroll
              className={cn(
                'stroke-placeholder',
                focused && 'stroke-foreground'
              )}
              size={breakpoints.md ? 20 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          headerTitle: () => <HeaderTitle>Inbox</HeaderTitle>,
          tabBarButton: ({ children, onPress, ...props }) => (
            <Button
              aria-selected={props['aria-selected']}
              className="web:aria-selected:bg-accent"
              onPress={onPress}
              size={breakpoints.md ? 'icon' : 'default'}
              variant="ghost"
            >
              {children}
            </Button>
          ),
          tabBarIcon: ({ focused }) => (
            <Bell
              className={cn(
                'stroke-placeholder',
                focused && 'stroke-foreground'
              )}
              size={breakpoints.md ? 20 : 24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerTitle: () => <HeaderTitle>Settings</HeaderTitle>,
          tabBarItemStyle: breakpoints.md ? { marginTop: 'auto' } : undefined,
          tabBarButton: ({ children, onPress, ...props }) => (
            <Button
              aria-selected={props['aria-selected']}
              className="web:aria-selected:bg-accent"
              onPress={onPress}
              size={breakpoints.md ? 'icon' : 'default'}
              variant="ghost"
            >
              {children}
            </Button>
          ),
          tabBarIcon: ({ focused }) => (
            <Bolt
              className={cn(
                'stroke-placeholder',
                focused && 'stroke-foreground'
              )}
              size={breakpoints.md ? 20 : 24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
