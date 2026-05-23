import * as cardMutations from '@/features/cards/mutations/cards';
import { db } from '@/lib/db';

export const getRecordIdForLink = async (id: string) => {
  const { data } = await db.queryOnce({
    links: {
      $: { fields: ['id' as const], where: { id } },
      record: { $: { fields: ['id' as const] } },
    },
  });

  return data.links[0]?.record?.id;
};

export const queueRecordCardRefresh = (recordId?: string) => {
  if (!recordId) return;
  void cardMutations.refreshRecordCards({ recordId })?.catch(() => undefined);
};
