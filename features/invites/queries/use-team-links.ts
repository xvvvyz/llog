import { useUi } from '@/features/account/queries/use-ui';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useTeamInvites = ({ teamId }: { teamId?: string | null } = {}) => {
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId === null ? undefined : (teamId ?? activeTeamId);

  const { data, isLoading } = db.useQuery(
    resolvedTeamId
      ? {
          invites: {
            $: {
              fields: [
                'id' as const,
                'role' as const,
                'teamId' as const,
                'token' as const,
              ],
              where: { team: resolvedTeamId },
            },
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
    isLoading: !!resolvedTeamId && (isLoading || !hasCurrentResult),
  };
};
