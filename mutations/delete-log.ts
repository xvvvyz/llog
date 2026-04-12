import { apiOrThrow } from '@/utilities/api';

export const deleteLog = async ({ id }: { id?: string }) => {
  if (!id) return;

  return apiOrThrow(
    `/logs/${id}`,
    { method: 'DELETE' },
    'Failed to delete log'
  );
};
