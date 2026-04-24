import { useProfile } from '@/features/account/queries/use-profile';
import { useActivities } from '@/features/activity/queries/use-activities';
import { PENDING_INVITE_KEY } from '@/features/invites/lib/storage';
import { useTeams } from '@/features/teams/queries/use-teams';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { cn } from '@/lib/cn';
import { db } from '@/lib/db';
import { useUi } from '@/queries/use-ui';
import { UI } from '@/theme/ui';
import { Avatar } from '@/ui/avatar';
import { Icon } from '@/ui/icon';
import { Loading } from '@/ui/loading';
import { TabButton } from '@/ui/tab-button';
import { Text } from '@/ui/text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, router, Tabs } from 'expo-router';
import { Bell, MagnifyingGlass, SquaresFour } from 'phosphor-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

const NEEDS_RECORD = new Set([
  'record_published',
  'reply_posted',
  'reaction_added',
]);

export default function Layout() {
  const [checkedPending, setCheckedPending] = React.useState(false);
  const auth = db.useAuth();
  const breakpoints = useBreakpoints();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const ui = useUi();
  const { activities } = useActivities();
  const { teams, isLoading: teamsLoading } = useTeams();

  const unreadCount = React.useMemo(() => {
    if (!profile.id) return 0;

    return activities.filter(
      (a) =>
        a.actor?.id !== profile.id &&
        (!NEEDS_RECORD.has(a.type) || a.record) &&
        (!ui.activityLastReadDate ||
          String(a.date ?? '') > ui.activityLastReadDate)
    ).length;
  }, [activities, profile.id, ui.activityLastReadDate]);

  React.useEffect(() => {
    if (!auth.user || profile.isLoading || !profile.id) return;
    let cancelled = false;

    const checkPendingInvite = async () => {
      const token = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (cancelled) return;

      if (token) {
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        if (!cancelled) router.replace(`/invite/${token}`);
        return;
      }

      setCheckedPending(true);
    };

    checkPendingInvite();

    return () => {
      cancelled = true;
    };
  }, [auth.user, profile.isLoading, profile.id]);

  if (!auth.isLoading && !auth.user) return <Redirect href="/sign-in" />;
  if (!profile.isLoading && !profile.id) return <Redirect href="/onboarding" />;
  if (profile.isLoading || teamsLoading || !checkedPending) return <Loading />;
  if (profile.id && teams.length === 0) return <Redirect href="/new-team" />;

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
            : Platform.select({ default: 50, web: 56 })! + insets.bottom,
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
            <View>
              <Icon
                className={cn('text-placeholder', focused && 'text-foreground')}
                icon={Bell}
                size={24}
              />
              {unreadCount > 0 && (
                <View className="absolute -right-1.5 -top-1 h-4 min-w-4 px-1 rounded-full bg-primary items-center justify-center">
                  <Text className="font-bold leading-none text-[10px] text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
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
        name="account"
        options={{
          tabBarItemStyle: breakpoints.md
            ? { marginTop: 'auto', marginBottom: 8 }
            : undefined,
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
              className="border-border-secondary border"
              id={profile.id}
              seedId={profile.avatarSeedId}
              size={breakpoints.md ? 36 : 25}
            />
          ),
        }}
      />
    </Tabs>
  );
}
