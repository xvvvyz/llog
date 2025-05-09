import { Loading } from '@/components/loading';
import { useOnboarding } from '@/lib/use-onboarding';
import { Redirect, Tabs } from 'expo-router';

export default function Layout() {
  const onboarding = useOnboarding();

  if (onboarding.isLoading) {
    return <Loading />;
  }

  if (onboarding.requiresAuth) {
    return <Redirect href="/sign-in" />;
  }

  if (onboarding.requiresOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(logs)" options={{ title: 'Logs' }} />
      <Tabs.Screen name="(profile)/profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
