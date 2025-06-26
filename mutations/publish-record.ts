import { db } from '@/utilities/db';

export const publishRecord = async ({ id }: { id?: string }) => {
  if (!id) return;

  return db.transact(
    db.tx.records[id].update({ date: new Date().toISOString(), isDraft: false })
  );
};
