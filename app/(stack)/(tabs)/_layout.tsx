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
          tabBarIcon: ({ color, focused }) => (
            <Scroll
              className={cn(
                '-mb-2 stroke-muted-foreground',
                focused && 'stroke-primary'
              )}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerTitle: () => <HeaderTitle>Settings</HeaderTitle>,
          tabBarIcon: ({ color, focused }) => (
            <Bolt
              className={cn(
                '-mb-2 stroke-muted-foreground',
                focused && 'stroke-primary'
              )}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
