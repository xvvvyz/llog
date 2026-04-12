import { apiOrThrow } from '@/utilities/api';

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

  await apiOrThrow(
    `/files/records/${recordId}/comments/${commentId}/media/${mediaId}`,
    { method: 'DELETE' },
    'Failed to delete comment media'
  );
};
