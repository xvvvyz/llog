import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';

export const useTeamInvites = () => {
  const { activeTeamId } = useUi();

  const { data, isLoading } = db.useQuery(
    activeTeamId
      ? {
          invites: {
            $: { where: { team: activeTeamId } },
            creator: {},
          },
        }
      : null
  );

  return { invites: data?.invites ?? [], isLoading };
};
