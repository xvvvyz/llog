import { db } from '@/utilities/ui/db';

export const deleteLogTag = async ({ id }: { id?: string }) => {
  if (!id) return;
  return db.transact(db.tx.logTags[id].delete());
};
