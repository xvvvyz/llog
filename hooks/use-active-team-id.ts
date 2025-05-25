import { db } from '@/utilities/db';

export function useActiveTeamId() {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? {
          teams: {
            $: { fields: ['id'], where: { 'ui.user.id': auth.user.id } },
          },
        }
      : null
  );

  return { isLoading, teamId: data?.teams?.[0]?.id };
}
