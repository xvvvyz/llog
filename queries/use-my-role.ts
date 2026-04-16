import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import * as p from '@/utilities/permissions';

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
