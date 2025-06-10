import { db } from '@/utilities/ui/db';

export const getUi = async () => {
  const auth = await db.getAuth();
  if (!auth) return;

  const { data } = await db.queryOnce({
    ui: {
      $: { where: { user: auth.id } },
      logTags: { $: { fields: ['id'] } },
      team: {},
    },
  });

  return data?.ui?.[0];
};
