import { api } from '@/utilities/api';

export const deleteRecordImage = async ({
  imageId,
  recordId,
}: {
  imageId?: string;
  recordId?: string;
}) => {
  if (!imageId || !recordId) return;

  return await api(`/files/records/${recordId}/images/${imageId}`, {
    method: 'DELETE',
  });
};
