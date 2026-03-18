import { api } from '@/utilities/api';
import { db } from '@/utilities/db';

export const deleteCommentMedia = async ({
  commentId,
  mediaId,
  recordId,
}: {
  commentId?: string;
  mediaId?: string;
  recordId?: string;
}) => {
  if (!commentId || !mediaId || !recordId) return;
  db.transact(db.tx.media[mediaId].delete());

  await api(
    `/files/records/${recordId}/comments/${commentId}/media/${mediaId}`,
    { method: 'DELETE' }
  );
};
