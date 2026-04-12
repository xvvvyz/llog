import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';

export const useTeamInviteLinks = ({ teamId }: { teamId?: string } = {}) => {
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId ?? activeTeamId;

  const { data, isLoading } = db.useQuery(
    resolvedTeamId
      ? {
          inviteLinks: {
            $: { where: { team: resolvedTeamId } },
            creator: {},
            logs: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  return { inviteLinks: data?.inviteLinks ?? [], isLoading };
};
