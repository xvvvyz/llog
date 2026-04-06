import { api } from '@/utilities/api';

export const removeMember = async ({
  teamId,
  roleId,
}: {
  teamId: string;
  roleId: string;
}) => {
  await api(`/teams/${teamId}/members/${roleId}`, { method: 'DELETE' });
};
