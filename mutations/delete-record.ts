import { apiOrThrow } from '@/lib/api';

export const deleteRecord = async ({ id }: { id: string }) => {
  return apiOrThrow(
    `/records/${id}`,
    { method: 'DELETE' },
    'Failed to delete record'
  );
};
