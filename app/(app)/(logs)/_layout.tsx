import { Plus } from '@/components/icons/plus';
import { Button } from '@/components/ui/button';
import { Link, Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="[id]"
        options={{
          headerBackButtonDisplayMode: 'default',
          headerTitle: '',
        }}
      />
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => (
            <Link asChild href="/new-log">
              <Button className="web:mr-2" size="icon" variant="link">
                <Plus className="color-foreground" />
              </Button>
            </Link>
          ),
          headerTitle: 'Logs',
        }}
      />
      <Stack.Screen
        name="new-log"
        options={{
          headerBackButtonDisplayMode: 'default',
          headerTitle: 'New log',
        }}
      />
    </Stack>
  );
}
