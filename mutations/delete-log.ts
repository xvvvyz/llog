import { api } from '@/utilities/api';
import { db } from '@/utilities/db';

export const deleteLog = async ({ id }: { id?: string }) => {
  if (!id) return;
  await api(`/logs/${id}`, { method: 'DELETE' });
  return db.transact(db.tx.logs[id].delete());
};
