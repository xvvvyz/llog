import { db } from '@/utilities/db';

export const deleteLog = async ({ id }: { id?: string }) => {
  if (!id) return;
  return db.transact(db.tx.logs[id].delete());
};
