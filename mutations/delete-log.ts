import { apiOrThrow } from '@/utilities/api';

export const deleteLog = async ({ id }: { id: string }) => {
  return apiOrThrow(
    `/logs/${id}`,
    { method: 'DELETE' },
    'Failed to delete log'
  );
};
