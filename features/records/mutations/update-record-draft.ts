import { db } from '@/lib/db';

export const updateRecordDraft = async ({
  id,
  tagIds,
  text,
}: {
  id?: string;
  tagIds?: string[];
  text: string;
}) => {
  if (!id) return;
  const uniqueTagIds = [...new Set(tagIds ?? [])];

  return db.transact([
    db.tx.records[id].update({ text }),
    ...uniqueTagIds.map((tagId) => db.tx.records[id].link({ tags: tagId })),
  ]);
};
