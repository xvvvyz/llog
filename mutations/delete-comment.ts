import { apiOrThrow } from '@/utilities/api';

export const deleteComment = async ({
  id,
  recordId,
}: {
  id?: string;
  recordId?: string;
}) => {
  if (!id || !recordId) return;
  return apiOrThrow(
    `/records/${recordId}/comments/${id}`,
    { method: 'DELETE' },
    'Failed to delete comment'
  );
};
