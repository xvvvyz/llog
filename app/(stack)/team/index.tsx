import { useUi } from '@/features/account/queries/use-ui';
import { Redirect } from 'expo-router';

export default function TeamIndex() {
  const { activeTeamId } = useUi();
  if (!activeTeamId) return <Redirect href="/" />;
  return <Redirect href={`/team/${activeTeamId}`} />;
}
