import { db } from '@/lib/db';
import * as p from '@/lib/permissions';
import { useUi } from '@/queries/use-ui';

export const useMyRole = ({ teamId }: { teamId?: string } = {}) => {
  const auth = db.useAuth();
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId ?? activeTeamId;

  const { data, isLoading } = db.useQuery(
    auth.user && resolvedTeamId
      ? {
          roles: {
            $: {
              where: {
                team: resolvedTeamId,
                userId: auth.user.id,
              },
            },
          },
        }
      : null
  );

  const role = data?.roles?.[0];

  return {
    ...role,
    ...p.getTeamPermissionFlags(role?.role),
    isLoading,
  };
};
