import { deleteMedia } from '@/features/media/mutations/requests';

export const deleteRecordMedia = async ({
  mediaId,
  recordId,
}: {
  mediaId?: string;
  recordId?: string;
}) => {
  if (!mediaId || !recordId) return;

  await deleteMedia({
    errorMessage: 'Failed to delete record media',
    path: `/files/records/${recordId}/media/${mediaId}`,
  });
};
