import { api } from '@/utilities/api';

export const deleteCommentImage = async ({
  commentId,
  imageId,
  recordId,
}: {
  commentId?: string;
  imageId?: string;
  recordId?: string;
}) => {
  if (!commentId || !imageId || !recordId) return;

  return await api(
    `/files/records/${recordId}/comments/${commentId}/images/${imageId}`,
    { method: 'DELETE' }
  );
};
