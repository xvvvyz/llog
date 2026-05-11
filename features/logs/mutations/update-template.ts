import { getTemplateTagChanges } from '@/domain/logs/templates';
import { db } from '@/lib/db';

export const updateTemplate = async ({
  id,
  tagIds,
  text,
}: {
  id: string;
  tagIds?: string[];
  text?: string;
}) => {
  const fields: { text?: string } = {};

  if (text !== undefined) {
    if (!text.trim()) return;
    fields.text = text;
  }

  if (tagIds === undefined) {
    return db.transact(db.tx.templates[id].update(fields));
  }

  const { data } = await db.queryOnce({
    templates: {
      $: { fields: ['id'], where: { id } },
      tags: { $: { fields: ['id'] } },
    },
  });

  const template = data.templates?.[0];

  const { linkTagIds, unlinkTagIds } = getTemplateTagChanges({
    currentTagIds: template?.tags?.map((tag) => tag.id),
    nextTagIds: tagIds,
  });

  await db.transact(db.tx.templates[id].update(fields));

  const tagTransactions = [
    ...linkTagIds.map((tagId) => db.tx.templates[id].link({ tags: tagId })),
    ...unlinkTagIds.map((tagId) => db.tx.templates[id].unlink({ tags: tagId })),
  ];

  if (!tagTransactions.length) return;
  return db.transact(tagTransactions);
};
