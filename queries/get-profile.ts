import { db } from '@/utilities/db';

export const getProfile = async () => {
  const auth = await db.getAuth();
  if (!auth) return;

  const { data } = await db.queryOnce({
    profiles: {
      $: { where: { user: auth.id } },
    },
  });

  return data?.profiles?.[0];
};
