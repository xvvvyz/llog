import { db } from '@/utilities/db';

export const deleteTag = async ({ id }: { id?: string }) => {
  if (!id) return;
  return db.transact(db.tx.tags[id].delete());
};
