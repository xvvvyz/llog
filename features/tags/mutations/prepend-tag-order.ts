import type { TagType } from '@/features/tags/types/tag';
import { db } from '@/lib/db';

type TransactionInput = Parameters<typeof db.transact>[0];
type Transaction = Extract<TransactionInput, unknown[]>[number];

export const getPrependTagOrderTransactions = async ({
  logId,
  tagId,
  teamId,
  type,
}: {
  logId?: string;
  tagId: string;
  teamId: string;
  type: TagType;
}): Promise<Transaction[]> => {
  const { data } = await db.queryOnce({
    tags: {
      $: {
        fields: ['id' as const],
        order: { order: 'asc' as const },
        where: { teamId, type, ...(logId && { logs: logId }) },
      },
    },
  });

  return data.tags
    .filter((tag) => tag.id !== tagId)
    .map((tag, index) => db.tx.tags[tag.id].update({ order: index + 1 }));
};
