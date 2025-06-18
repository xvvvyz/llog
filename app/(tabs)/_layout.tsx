import { LogDeleteSheet } from '@/components/log-delete-sheet';
import { LogEditSheet } from '@/components/log-edit-sheet';
import { LogTagsSheet } from '@/components/log-tags-sheet';
import { RecordCreateSheet } from '@/components/record-create-sheet';
import { TagDeleteSheet } from '@/components/tag-delete-sheet';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Loading } from '@/components/ui/loading';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useProfile } from '@/queries/use-profile';
import { db } from '@/utilities/ui/db';
import { cn } from '@/utilities/ui/utils';
import { Redirect, Tabs } from 'expo-router';
import { Bell, LayoutGrid, Rows3 } from 'lucide-react-native';
import { Fragment } from 'react';
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
    <Fragment>
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
            borderRightWidth: 0,
            borderTopWidth: 0,
            elevation: 0,
            height: breakpoints.md
              ? undefined
              : Platform.select({ default: 50, web: 56 }) + insets.bottom,
            marginTop: 0,
            minWidth: 0,
            paddingBottom: breakpoints.md ? 8 : undefined,
            paddingEnd: breakpoints.md ? 8 : 12,
            paddingStart: breakpoints.md ? 8 : 12,
            paddingTop: breakpoints.md ? 8 : 6,
          },
        }}
      >
        <Tabs.Screen
          name="(logs)"
          options={{
            tabBarButton: ({ children, onPress, ...props }) => (
              <Button
                aria-selected={props['aria-selected']}
                className={cn('h-11', breakpoints.md && 'size-14')}
                onPress={onPress}
                size={breakpoints.md ? 'icon' : 'default'}
                variant="link"
              >
                {children}
              </Button>
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
          name="rules"
          options={{
            tabBarButton: ({ children, onPress, ...props }) => (
              <Button
                aria-selected={props['aria-selected']}
                className={cn('h-11', breakpoints.md && 'size-14')}
                onPress={onPress}
                size={breakpoints.md ? 'icon' : 'default'}
                variant="link"
              >
                {children}
              </Button>
            ),
            tabBarIcon: ({ focused }) => (
              <Icon
                className={cn('text-placeholder', focused && 'text-foreground')}
                icon={Rows3}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            tabBarButton: ({ children, onPress, ...props }) => (
              <Button
                aria-selected={props['aria-selected']}
                className={cn('h-11', breakpoints.md && 'size-14')}
                onPress={onPress}
                size={breakpoints.md ? 'icon' : 'default'}
                variant="link"
              >
                {children}
              </Button>
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
              <Button
                aria-selected={props['aria-selected']}
                className={cn('h-11', breakpoints.md && 'size-14')}
                onPress={onPress}
                size={breakpoints.md ? 'icon' : 'default'}
                variant="link"
              >
                {children}
              </Button>
            ),
            tabBarIcon: () => (
              <Avatar
                avatar={profile.avatar}
                height={28}
                id={profile.id}
                width={28}
              />
            ),
          }}
        />
      </Tabs>
      <LogEditSheet />
      <LogTagsSheet />
      <RecordCreateSheet />
      <LogDeleteSheet />
      <TagDeleteSheet />
    </Fragment>
  );
}
