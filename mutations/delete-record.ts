import { apiOrThrow } from '@/utilities/api';

export const deleteRecord = async ({ id }: { id?: string }) => {
  if (!id) return;

  return apiOrThrow(
    `/records/${id}`,
    { method: 'DELETE' },
    'Failed to delete record'
  );
};
