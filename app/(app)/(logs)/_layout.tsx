import { Button } from '@/components/button';
import { Plus } from '@/components/icons/plus';
import { Link, Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="[id]"
        options={{
          headerBackButtonDisplayMode: Platform.select({
            native: 'default',
            web: 'minimal',
          }),
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
          headerBackButtonDisplayMode: Platform.select({
            native: 'default',
            web: 'minimal',
          }),
          headerTitle: 'New log',
        }}
      />
    </Stack>
  );
}
