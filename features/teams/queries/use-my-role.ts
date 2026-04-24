import * as permissions from '@/features/teams/lib/permissions';
import { db } from '@/lib/db';
import { useUi } from '@/queries/use-ui';

export const useMyRole = ({ teamId }: { teamId?: string } = {}) => {
  const auth = db.useAuth();
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId ?? activeTeamId;

  const { data, isLoading } = db.useQuery(
    auth.user && resolvedTeamId
      ? {
          roles: {
            $: { where: { team: resolvedTeamId, userId: auth.user.id } },
          },
        }
      : null
  );

  const role = data?.roles?.[0];

  return {
    ...role,
    ...permissions.getTeamPermissionFlags(role?.role),
    isLoading,
  };
};
