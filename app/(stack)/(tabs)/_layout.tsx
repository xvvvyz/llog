import { Bolt } from '@/components/icons/bolt';
import { Scroll } from '@/components/icons/scroll';
import { Button } from '@/components/ui/button';
import { cn } from '@/utilities/cn';
import { Link, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Layout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          height: insets.bottom + 48 + (Platform.OS === 'web' ? 8 : 0),
          paddingEnd: 8,
          paddingStart: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: ({ children }) => (
            <Link asChild href="/">
              <Button size="lg" variant="ghost">
                {children}
              </Button>
            </Link>
          ),
          tabBarIcon: ({ focused }) => (
            <Scroll
              className={cn('stroke-placeholder', focused && 'stroke-primary')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarButton: ({ children }) => (
            <Link asChild href="/settings">
              <Button size="lg" variant="ghost">
                {children}
              </Button>
            </Link>
          ),
          tabBarIcon: ({ focused }) => (
            <Bolt
              className={cn('stroke-placeholder', focused && 'stroke-primary')}
            />
          ),
        }}
      />
    </Tabs>
  );
}
