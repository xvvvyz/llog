import { api } from '@/utilities/api';
import { db } from '@/utilities/db';

export const deleteComment = async ({
  id,
  recordId,
}: {
  id?: string;
  recordId?: string;
}) => {
  if (!id || !recordId) return;
  await api(`/records/${recordId}/comments/${id}`, { method: 'DELETE' });
  return db.transact(db.tx.comments[id].delete());
};
