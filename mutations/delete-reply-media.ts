import { apiOrThrow } from '@/utilities/api';

export const deleteReplyMedia = async ({
  replyId,
  mediaId,
  recordId,
}: {
  replyId?: string;
  mediaId?: string;
  recordId?: string;
}) => {
  if (!replyId || !mediaId || !recordId) return;

  await apiOrThrow(
    `/files/records/${recordId}/replies/${replyId}/media/${mediaId}`,
    { method: 'DELETE' },
    'Failed to delete reply media'
  );
};
