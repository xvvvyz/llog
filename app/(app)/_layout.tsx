import { Bolt } from '@/components/icons/bolt';
import { Scroll } from '@/components/icons/scroll';
import { Loading } from '@/components/loading';
import { useOnboarding } from '@/utilities/hooks/use-onboarding';
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { borderTopWidth: 0 },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="(logs)"
        options={{
          tabBarIcon: ({ color }) => (
            <Scroll className="native:-mb-2" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(settings)/settings"
        options={{
          tabBarIcon: ({ color }) => (
            <Bolt className="native:-mb-2" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
