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
  if (text !== undefined) fields.text = text.trim();

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
  const currentTagIds = new Set(template?.tags?.map((tag) => tag.id) ?? []);
  const nextTagIds = new Set(tagIds);

  const linkTagIds = [...nextTagIds].filter(
    (tagId) => !currentTagIds.has(tagId)
  );

  const unlinkTagIds = [...currentTagIds].filter(
    (tagId) => !nextTagIds.has(tagId)
  );

  await db.transact(db.tx.templates[id].update(fields));

  const tagTransactions = [
    ...linkTagIds.map((tagId) => db.tx.templates[id].link({ tags: tagId })),
    ...unlinkTagIds.map((tagId) => db.tx.templates[id].unlink({ tags: tagId })),
  ];

  if (!tagTransactions.length) return;
  return db.transact(tagTransactions);
};
