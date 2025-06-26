import { getProfile } from '@/queries/get-profile';
import { db } from '@/utilities/db';

export const hasRecordDraft = async ({ logId }: { logId?: string }) => {
  if (!logId) return;
  const profile = await getProfile();
  if (!profile) return;

  const { data } = await db.queryOnce({
    records: {
      $: {
        fields: ['id'],
        where: { author: profile.id, log: logId, isDraft: true },
      },
    },
  });

  return !!data.records?.[0];
};
