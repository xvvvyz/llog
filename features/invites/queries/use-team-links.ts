import { useUi } from '@/features/account/queries/use-ui';
import { useConnectivity } from '@/features/offline/connectivity';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useTeamInvites = ({ teamId }: { teamId?: string | null } = {}) => {
  const { activeTeamId } = useUi();
  const { isOffline } = useConnectivity();
  const resolvedTeamId = teamId === null ? undefined : (teamId ?? activeTeamId);

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

  const hasCurrentResult = useCurrentQueryResult(resolvedTeamId, data);

  return {
    invites: resolvedTeamId && hasCurrentResult ? (data?.invites ?? []) : [],
    isReady: !resolvedTeamId || hasCurrentResult,
    isLoading:
      !!resolvedTeamId && !isOffline && (isLoading || !hasCurrentResult),
  };
};
