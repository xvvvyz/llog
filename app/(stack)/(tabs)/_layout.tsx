import { Bolt } from '@/components/icons/bolt';
import { Scroll } from '@/components/icons/scroll';
import { Button } from '@/components/ui/button';
import { cn } from '@/utilities/cn';
import { Link, Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { borderTopWidth: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: ({ children }) => (
            <Link asChild href="/">
              <Button className="h-full w-full" variant="link">
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
              <Button className="h-full w-full" variant="link">
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
