import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';

export const useTeamInviteLinks = () => {
  const { activeTeamId } = useUi();

  const { data, isLoading } = db.useQuery(
    activeTeamId
      ? {
          inviteLinks: {
            $: { where: { team: activeTeamId } },
            creator: {},
            logs: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  return { inviteLinks: data?.inviteLinks ?? [], isLoading };
};
