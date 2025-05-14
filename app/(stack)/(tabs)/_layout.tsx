import { HeaderTitle } from '@/components/header-title';
import { Bolt } from '@/components/icons/bolt';
import { Plus } from '@/components/icons/plus';
import { Scroll } from '@/components/icons/scroll';
import { Button } from '@/components/ui/button';
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
          tabBarIcon: ({ color }) => <Scroll className="-mb-2" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerTitle: () => <HeaderTitle>Settings</HeaderTitle>,
          tabBarIcon: ({ color }) => <Bolt className="-mb-2" color={color} />,
        }}
      />
    </Tabs>
  );
}
