import { LogDeleteSheet } from '@/components/log-delete-sheet';
import { LogEditSheet } from '@/components/log-edit-sheet';
import { LogTagsSheet } from '@/components/log-tags-sheet';
import { TagDeleteSheet } from '@/components/tag-delete-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Loading } from '@/components/ui/loading';
import { Title } from '@/components/ui/title';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useHeaderConfig } from '@/hooks/use-header-config';
import { useOnboarding } from '@/queries/use-onboarding';
import { cn } from '@/utilities/cn';
import { Redirect, Tabs } from 'expo-router';
import { Bell, Bolt, Scroll } from 'lucide-react-native';
import { Fragment } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Layout() {
  const breakpoints = useBreakpoints();
  const headerConfig = useHeaderConfig();
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
    <Fragment>
      <Tabs
        screenOptions={{
          ...headerConfig,
          animation: Platform.select({
            // android emulator has background color flashes with shift animation
            android: 'none',
            default: 'shift',
          }),
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
            headerShown: false,
            tabBarButton: ({ children, onPress, ...props }) => (
              <Button
                aria-selected={props['aria-selected']}
                className={cn(
                  'md:web:aria-selected:bg-accent',
                  breakpoints.md && 'size-14'
                )}
                onPress={onPress}
                size={breakpoints.md ? 'icon' : 'default'}
                variant="ghost"
              >
                {children}
              </Button>
            ),
            tabBarIcon: ({ focused }) => (
              <Icon
                className={cn('text-placeholder', focused && 'text-foreground')}
                icon={Scroll}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            headerTitle: () => <Title>Notifications</Title>,
            tabBarButton: ({ children, onPress, ...props }) => (
              <Button
                aria-selected={props['aria-selected']}
                className={cn(
                  'md:web:aria-selected:bg-accent',
                  breakpoints.md && 'size-14'
                )}
                onPress={onPress}
                size={breakpoints.md ? 'icon' : 'default'}
                variant="ghost"
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
          name="settings"
          options={{
            headerTitle: () => <Title>Settings</Title>,
            tabBarItemStyle: breakpoints.md ? { marginTop: 'auto' } : undefined,
            tabBarButton: ({ children, onPress, ...props }) => (
              <Button
                aria-selected={props['aria-selected']}
                className={cn(
                  'md:web:aria-selected:bg-accent',
                  breakpoints.md && 'size-14'
                )}
                onPress={onPress}
                size={breakpoints.md ? 'icon' : 'default'}
                variant="ghost"
              >
                {children}
              </Button>
            ),
            tabBarIcon: ({ focused }) => (
              <Icon
                className={cn('text-placeholder', focused && 'text-foreground')}
                icon={Bolt}
              />
            ),
          }}
        />
      </Tabs>
      <LogEditSheet />
      <LogTagsSheet />
      <LogDeleteSheet />
      <TagDeleteSheet />
    </Fragment>
  );
}
