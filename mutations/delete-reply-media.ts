import { deleteMedia } from '@/mutations/media';

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

  await deleteMedia({
    errorMessage: 'Failed to delete reply media',
    path: `/files/records/${recordId}/replies/${replyId}/media/${mediaId}`,
  });
};
