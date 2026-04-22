import { api } from '@/lib/api';

export const deleteTeamImage = async (teamId?: string) => {
  if (!teamId) return;
  return api(`/files/teams/${teamId}/avatar`, { method: 'DELETE' });
};
