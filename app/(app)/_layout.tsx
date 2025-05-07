import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { Redirect, Stack } from 'expo-router';

export default function AppLayout() {
  const auth = useAuth();
  if (auth.isLoading) return <Loading />;
  if (!auth.user) return <Redirect href="./sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerTitle: 'llog',
        headerRight: () => (
          <Button
            disabled={auth.isLoading}
            onPress={auth.signOut}
            variant="link"
          >
            <Text>Sign out</Text>
          </Button>
        ),
      }}
    />
  );
}
