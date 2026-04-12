import { apiOrThrow } from '@/utilities/api';

export const deleteRecordMedia = async ({
  mediaId,
  recordId,
}: {
  mediaId?: string;
  recordId?: string;
}) => {
  if (!mediaId || !recordId) return;

  await apiOrThrow(
    `/files/records/${recordId}/media/${mediaId}`,
    { method: 'DELETE' },
    'Failed to delete record media'
  );
};
