import { apiOrThrow } from '@/utilities/api';

export const deleteTeam = async ({ id }: { id: string }) => {
  return apiOrThrow(
    `/teams/${id}`,
    { method: 'DELETE' },
    'Failed to delete team'
  );
};
