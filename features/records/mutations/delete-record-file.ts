import { deleteFile } from '@/features/files/mutations/requests';

export const deleteRecordFile = async ({
  fileId,
  recordId,
}: {
  fileId?: string;
  recordId?: string;
}) => {
  if (!fileId || !recordId) return;

  await deleteFile({
    errorMessage: 'Failed to delete record files',
    path: `/files/records/${recordId}/files/${fileId}`,
  });
};
