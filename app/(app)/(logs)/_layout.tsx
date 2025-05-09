import { BackButton } from '@/components/back-button';
import { Plus } from '@/components/icons/plus';
import { Button } from '@/components/ui/button';
import { Link, Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerLeft: () => <BackButton />,
          headerTitle: '',
        }}
      />
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => (
            <Link asChild href="/new-log">
              <Button size="icon" variant="link">
                <Plus className="color-foreground" size={24} />
              </Button>
            </Link>
          ),
          headerTitle: 'Logs',
        }}
      />
      <Stack.Screen
        name="new-log"
        options={{
          headerLeft: () => <BackButton />,
          headerTitle: 'New log',
        }}
      />
    </Stack>
  );
}
