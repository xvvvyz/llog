import { deleteFile } from '@/features/files/mutations/requests';

export const deleteReplyFile = async ({
  replyId,
  fileId,
  recordId,
}: {
  replyId?: string;
  fileId?: string;
  recordId?: string;
}) => {
  if (!replyId || !fileId || !recordId) return;

  await deleteFile({
    errorMessage: 'Failed to delete reply files',
    path: `/files/records/${recordId}/replies/${replyId}/files/${fileId}`,
  });
};
