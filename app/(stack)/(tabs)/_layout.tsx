import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Loading } from '@/components/ui/loading';
import { TabButton } from '@/components/ui/tab-button';
import { Text } from '@/components/ui/text';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActivities } from '@/queries/use-activities';
import { useProfile } from '@/queries/use-profile';
import { useTeams } from '@/queries/use-teams';
import { useUi } from '@/queries/use-ui';
import { UI } from '@/theme/ui';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router, Tabs } from 'expo-router';
import { Bell, MagnifyingGlass, SquaresFour } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NEEDS_RECORD = new Set([
  'record_published',
  'comment_posted',
  'reaction_added',
]);

export default function Layout() {
  const [checkedPending, setCheckedPending] = useState(false);
  const auth = db.useAuth();
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const ui = useUi();
  const { activities } = useActivities();
  const { teams, isLoading: teamsLoading } = useTeams();

  const unreadCount = useMemo(() => {
    if (!profile.id) return 0;

    return activities.filter(
      (a) =>
        a.actor?.id !== profile.id &&
        (!NEEDS_RECORD.has(a.type) || a.record) &&
        (!ui.activityLastReadDate ||
          (a.date as unknown as string) > ui.activityLastReadDate)
    ).length;
  }, [activities, profile.id, ui.activityLastReadDate]);

  useEffect(() => {
    if (!auth.user || profile.isLoading || !profile.id) return;

    AsyncStorage.getItem('pendingInviteToken').then((token) => {
      if (token) {
        AsyncStorage.removeItem('pendingInviteToken');
        router.replace(`/invite/${token}`);
      } else {
        setCheckedPending(true);
      }
    });
  }, [auth.user, profile.isLoading, profile.id]);

  if (!auth.isLoading && !auth.user) {
    return <Redirect href="/sign-in" />;
  }

  if (!profile.isLoading && !profile.id) {
    return <Redirect href="/onboarding" />;
  }

  if (!teamsLoading && profile.id && teams.length === 0) {
    return <Redirect href="/new-team" />;
  }

  if (profile.isLoading || !checkedPending) {
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
          backgroundColor: UI[colorScheme].background,
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
              icon={SquaresFour}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarButton: ({ children, onPress, ...props }) => (
            <TabButton
              aria-selected={props['aria-selected']}
              href="/search"
              onPress={onPress}
            >
              {children}
            </TabButton>
          ),
          tabBarIcon: ({ focused }) => (
            <Icon
              className={cn('text-placeholder', focused && 'text-foreground')}
              icon={MagnifyingGlass}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarItemStyle: breakpoints.md
            ? { marginTop: 'auto', marginBottom: 8 }
            : undefined,
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
            <View>
              <Icon
                className={cn('text-placeholder', focused && 'text-foreground')}
                icon={Bell}
                size={24}
              />
              {unreadCount > 0 && (
                <View
                  className="absolute items-center justify-center rounded-full bg-primary"
                  style={{
                    right: -6,
                    top: -4,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                  }}
                >
                  <Text className="text-[10px] font-bold leading-none text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
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
