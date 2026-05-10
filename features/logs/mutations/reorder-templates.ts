import { db } from '@/lib/db';
import { applyOrderedIds, reorderItems } from '@/lib/reorder-items';

export const reorderTemplates = async ({
  logId,
  orderedIds,
}: {
  logId?: string;
  orderedIds: string[];
}) => {
  if (!logId) return;

  const { data } = await db.queryOnce({
    templates: {
      $: { fields: ['id'], order: { order: 'asc' }, where: { log: logId } },
    },
  });

  const orderedTemplates = applyOrderedIds(data.templates ?? [], orderedIds);

  return reorderItems(orderedTemplates, (id, order) =>
    db.tx.templates[id].update({ order })
  );
};
