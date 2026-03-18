import { api } from '@/utilities/api';
import { db } from '@/utilities/db';

export const deleteRecordMedia = async ({
  mediaId,
  recordId,
}: {
  mediaId?: string;
  recordId?: string;
}) => {
  if (!mediaId || !recordId) return;
  db.transact(db.tx.media[mediaId].delete());

  await api(`/files/records/${recordId}/media/${mediaId}`, {
    method: 'DELETE',
  });
};
