import { api } from '@/utilities/api';
import { db } from '@/utilities/db';

export const deleteRecord = async ({ id }: { id?: string }) => {
  if (!id) return;
  await api(`/records/${id}`, { method: 'DELETE' });
  return db.transact(db.tx.records[id].delete());
};
