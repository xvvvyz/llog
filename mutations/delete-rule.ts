import { db } from '@/utilities/ui/db';

export const deleteRule = async ({ id }: { id?: string }) => {
  if (!id) return;
  return db.transact(db.tx.rules[id].delete());
};
