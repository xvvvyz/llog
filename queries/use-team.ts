import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';

export const useTeam = () => {
  const { activeTeamId } = useUi();

  const { data, isLoading } = db.useQuery(
    activeTeamId
      ? {
          teams: {
            $: { where: { id: activeTeamId } },
          },
        }
      : null
  );

  const team = data?.teams?.[0];

  return { ...team, isLoading };
};
