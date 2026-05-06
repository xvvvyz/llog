import { useUi } from '@/features/account/queries/use-ui';
import { db } from '@/lib/db';

export const useTeamInvites = ({ teamId }: { teamId?: string } = {}) => {
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId ?? activeTeamId;

  const { data, isLoading } = db.useQuery(
    resolvedTeamId
      ? {
          invites: {
            $: { where: { team: resolvedTeamId } },
            creator: {},
            logs: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  return { invites: data?.invites ?? [], isLoading };
};
