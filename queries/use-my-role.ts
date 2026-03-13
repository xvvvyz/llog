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
  const canManage = role?.role === Role.Owner || role?.role === Role.Admin;

  return { ...role, canManage, isLoading };
};
