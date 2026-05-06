import { useUi } from '@/features/account/queries/use-ui';
import { db } from '@/lib/db';

export const useTeam = () => {
  const { activeTeamId } = useUi();

  const { data, isLoading } = db.useQuery(
    activeTeamId
      ? { teams: { $: { where: { id: activeTeamId } }, image: {} } }
      : null
  );

  const team = data?.teams?.[0];
  return { ...team, isLoading };
};
