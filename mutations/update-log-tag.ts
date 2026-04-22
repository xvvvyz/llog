import { db } from '@/lib/db';

export const updateTag = async ({ id, name }: { id: string; name: string }) => {
  return db.transact(db.tx.tags[id].update({ name }));
};
