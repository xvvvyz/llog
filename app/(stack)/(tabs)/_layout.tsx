import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Loading } from '@/components/ui/loading';
import { TabButton } from '@/components/ui/tab-button';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useProfile } from '@/queries/use-profile';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { Redirect, Tabs } from 'expo-router';
import { Bell, LayoutGrid } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Layout() {
  const auth = db.useAuth();
  const breakpoints = useBreakpoints();
  const insets = useSafeAreaInsets();
  const profile = useProfile();

  if (!auth.isLoading && !auth.user) {
    return <Redirect href="/sign-in" />;
  }

  if (!profile.isLoading && !profile.id) {
    return <Redirect href="/onboarding" />;
  }

  if (profile.isLoading) {
    return <Loading />;
  }

  return (
    <Tabs
      screenOptions={{
        animation: 'shift',
        headerShown: false,
        tabBarItemStyle: {
          marginBottom: breakpoints.md ? 8 : 0,
          marginRight: 0,
          marginTop: 0,
        },
        tabBarPosition: breakpoints.md ? 'left' : 'bottom',
        tabBarShowLabel: false,
        tabBarStyle: {
          borderRightWidth: breakpoints.md ? 1 : 0,
          borderTopWidth: 0,
          elevation: 0,
          height: breakpoints.md
            ? undefined
            : Platform.select({ default: 50, web: 56 }) + insets.bottom,
          marginTop: 0,
          minWidth: 0,
          paddingBottom: breakpoints.md ? 8 : 0,
          paddingEnd: breakpoints.md ? 8 : 12,
          paddingStart: breakpoints.md ? 8 : 12,
          paddingTop: breakpoints.md ? 8 : 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: ({ children, onPress, ...props }) => (
            <TabButton
              aria-selected={props['aria-selected']}
              href="/"
              onPress={onPress}
            >
              {children}
            </TabButton>
          ),
          tabBarIcon: ({ focused }) => (
            <Icon
              className={cn('text-placeholder', focused && 'text-foreground')}
              icon={LayoutGrid}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarButton: ({ children, onPress, ...props }) => (
            <TabButton
              aria-selected={props['aria-selected']}
              href="/activity"
              onPress={onPress}
            >
              {children}
            </TabButton>
          ),
          tabBarIcon: ({ focused }) => (
            <Icon
              className={cn('text-placeholder', focused && 'text-foreground')}
              icon={Bell}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarItemStyle: breakpoints.md ? { marginTop: 'auto' } : undefined,
          tabBarButton: ({ children, onPress, ...props }) => (
            <TabButton
              aria-selected={props['aria-selected']}
              href="/account"
              onPress={onPress}
            >
              {children}
            </TabButton>
          ),
          tabBarIcon: () => (
            <Avatar
              avatar={profile.image?.uri}
              id={profile.id}
              size={breakpoints.md ? 36 : 28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
