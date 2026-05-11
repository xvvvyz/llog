import * as permissions from '@/domain/teams/permissions';
import { useUi } from '@/features/account/queries/use-ui';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useMyRole = ({ teamId }: { teamId?: string } = {}) => {
  const auth = db.useAuth();
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId ?? activeTeamId;

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

  return {
    ...role,
    ...permissions.getTeamPermissionFlags(role?.role),
    isLoading: !!queryKey && (isLoading || !hasCurrentResult),
  };
};
