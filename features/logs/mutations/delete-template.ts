import { db } from '@/lib/db';

export const deleteTemplate = async ({ id }: { id: string }) => {
  return db.transact(db.tx.templates[id].delete());
};
