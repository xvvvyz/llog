import { db } from '@/lib/db';

export const updateRecord = async ({
  id,
  text,
}: {
  id?: string;
  text: string;
}) => {
  if (!id) return;
  return db.transact(db.tx.records[id].update({ text }));
};
