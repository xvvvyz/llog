import { db } from '@/utilities/db';

export const getActiveTeamId = async () => {
  const auth = await db.getAuth();
  if (!auth) return;

  const { data } = await db.queryOnce({
    ui: { $: { where: { user: auth.id } }, team: {} },
  });

  return data.ui?.[0]?.team?.id;
};
