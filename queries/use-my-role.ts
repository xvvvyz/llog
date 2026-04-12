import { Role } from '@/enums/roles';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';

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
  const isOwner = role?.role === Role.Owner;
  const isAdmin = role?.role === Role.Admin;
  const canManage = isOwner || isAdmin;
  return { ...role, canManage, isAdmin, isLoading, isOwner };
};
