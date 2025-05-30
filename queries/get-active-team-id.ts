import { db } from '@/utilities/db';

export const getActiveTeamId = async () => {
  const auth = await db.getAuth();
  if (!auth) return;

  const { data } = await db.queryOnce({
    teams: {
      $: { fields: ['id'], where: { 'ui.user.id': auth.id } },
    },
  });

  return data.teams?.[0]?.id;
};
