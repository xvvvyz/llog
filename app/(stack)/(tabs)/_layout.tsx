import { Bolt } from '@/components/icons/bolt';
import { Plus } from '@/components/icons/plus';
import { Scroll } from '@/components/icons/scroll';
import { Button } from '@/components/ui/button';
import { HeaderTitle } from '@/components/ui/header-title';
import { cn } from '@/utilities/cn';
import { Link, Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        tabBarShowLabel: false,
        tabBarStyle: { borderTopWidth: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerRight: () => (
            <Link asChild href="/new">
              <Button className="size-12" size="icon" variant="link">
                <Plus className="color-foreground" />
              </Button>
            </Link>
          ),
          headerTitle: () => <HeaderTitle>Logs</HeaderTitle>,
          tabBarButton: ({ children }) => (
            <Link asChild href="/">
              <Button className="h-full w-full" variant="link">
                {children}
              </Button>
            </Link>
          ),
          tabBarIcon: ({ focused }) => (
            <Scroll
              className={cn(
                'stroke-muted-foreground',
                focused && 'stroke-primary'
              )}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerTitle: () => <HeaderTitle>Settings</HeaderTitle>,
          tabBarButton: ({ children }) => (
            <Link asChild href="/settings">
              <Button className="h-full w-full" variant="link">
                {children}
              </Button>
            </Link>
          ),
          tabBarIcon: ({ focused }) => (
            <Bolt
              className={cn(
                'stroke-muted-foreground',
                focused && 'stroke-primary'
              )}
            />
          ),
        }}
      />
    </Tabs>
  );
}
