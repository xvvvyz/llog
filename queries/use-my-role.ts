import { Role } from '@/enums/roles';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';

export const useMyRole = () => {
  const auth = db.useAuth();
  const { activeTeamId } = useUi();

  const { data, isLoading } = db.useQuery(
    auth.user && activeTeamId
      ? {
          roles: {
            $: {
              where: {
                team: activeTeamId,
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
