import { db } from '@/lib/db';

export const deleteLink = async ({ id }: { id?: string }) => {
  if (!id) return;
  return db.transact(db.tx.links[id].delete());
};
