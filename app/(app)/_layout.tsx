import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { Redirect, Stack } from 'expo-router';

export default function Layout() {
  const auth = useAuth();
  if (auth.isLoading) return null;
  if (!auth.user) return <Redirect href="./sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerTitle: 'llog',
        headerRight: () => (
          <Button onPress={auth.signOut} variant="link">
            <Text>Sign out</Text>
          </Button>
        ),
      }}
    />
  );
}
