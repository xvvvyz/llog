import { db } from '@/utilities/db';

export const updateRecordDraft = async ({
  id,
  text,
}: {
  id?: string;
  text: string;
}) => {
  if (!id) return;
  return db.transact(db.tx.records[id].update({ text }));
};
