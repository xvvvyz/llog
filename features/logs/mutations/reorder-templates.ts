import { db } from '@/lib/db';

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

  const orderById = new Map(orderedIds.map((id, index) => [id, index]));

  const orderedTemplates = [...(data.templates ?? [])].sort(
    (a, b) =>
      (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );

  return db.transact(
    orderedTemplates.map((template, index) =>
      db.tx.templates[template.id].update({ order: index })
    )
  );
};
