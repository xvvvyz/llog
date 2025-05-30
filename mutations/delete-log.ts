import { db } from '@/utilities/db';

export const deleteLog = ({ id }: { id?: string }) => {
  if (!id) return;
  db.transact(db.tx.logs[id].delete());
};
