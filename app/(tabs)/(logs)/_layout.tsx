import { useHeaderConfig } from '@/hooks/use-header-config';
import { Stack } from 'expo-router';

export default function Layout() {
  const headerConfig = useHeaderConfig();
  return <Stack screenOptions={headerConfig} />;
}
