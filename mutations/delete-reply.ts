import { apiOrThrow } from '@/utilities/api';

export const deleteReply = async ({
  id,
  recordId,
}: {
  id: string;
  recordId: string;
}) => {
  return apiOrThrow(
    `/records/${recordId}/replies/${id}`,
    { method: 'DELETE' },
    'Failed to delete reply'
  );
};
