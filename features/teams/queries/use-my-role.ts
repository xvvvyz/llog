import * as permissions from '@/domain/teams/permissions';
import { useUi } from '@/features/account/queries/use-ui';
import { useConnectivity } from '@/features/offline/connectivity';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useMyRole = ({ teamId }: { teamId?: string | null } = {}) => {
  const auth = db.useAuth();
  const { activeTeamId, isLoading: uiLoading } = useUi();
  const { isOffline } = useConnectivity();
  const resolvedTeamId = teamId === null ? undefined : (teamId ?? activeTeamId);
  const shouldResolveActiveTeam = teamId === undefined;

  const { data, isLoading } = db.useQuery(
    auth.user && resolvedTeamId
      ? {
          roles: {
            $: {
              fields: ['id' as const, 'role' as const],
              where: { teamId: resolvedTeamId, userId: auth.user.id },
            },
          },
        }
      : null
  );

  const queryKey =
    auth.user && resolvedTeamId
      ? `${auth.user.id}:${resolvedTeamId}`
      : undefined;

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);
  const role = queryKey && hasCurrentResult ? data?.roles?.[0] : undefined;

  const isReady =
    teamId === null ||
    (!auth.isLoading &&
      !(shouldResolveActiveTeam && uiLoading) &&
      (!queryKey || hasCurrentResult));

  return {
    ...role,
    ...permissions.getTeamPermissionFlags(role?.role),
    isReady,
    isLoading:
      teamId !== null &&
      (auth.isLoading ||
        (shouldResolveActiveTeam && uiLoading) ||
        (!!queryKey && !isOffline && (isLoading || !hasCurrentResult))),
  };
};
