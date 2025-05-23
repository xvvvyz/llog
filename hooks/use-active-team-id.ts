import { db } from '@/utilities/db';

export function useActiveTeamId() {
  const auth = db.useAuth();

  const { data } = db.useQuery(
    auth.user
      ? {
          teams: {
            $: { fields: ['id'], where: { 'ui.user.id': auth.user.id } },
          },
        }
      : null
  );

  return data?.teams?.[0]?.id ?? null;
}
