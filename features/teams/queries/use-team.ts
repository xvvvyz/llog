import { db } from '@/lib/db';
import { useUi } from '@/queries/use-ui';

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
