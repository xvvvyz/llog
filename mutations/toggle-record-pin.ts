import { db } from '@/utilities/db';

export const toggleRecordPin = async ({
  id,
  isPinned,
}: {
  id: string;
  isPinned: boolean;
}) => {
  return db.transact(db.tx.records[id].update({ isPinned }));
};
