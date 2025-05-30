import { db } from '@/utilities/db';

export const deleteLogTag = ({ id }: { id?: string }) => {
  if (!id) return;
  db.transact(db.tx.logTags[id].delete());
};
