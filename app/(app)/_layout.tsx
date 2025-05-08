import { Loading } from '@/components/loading';
import { useOnboarding } from '@/lib/useOnboarding';
import { Redirect, Slot } from 'expo-router';

export default function Layout() {
  const onboarding = useOnboarding();

  if (onboarding.isLoading) {
    return <Loading />;
  }

  if (onboarding.requiresAuth) {
    return <Redirect href="./sign-in" />;
  }

  if (onboarding.requiresOnboarding) {
    return <Redirect href="./onboarding" />;
  }

  return <Slot />;
}
