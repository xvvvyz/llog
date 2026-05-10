import { apiOrThrow } from '@/lib/api';

export const deleteInviteLink = async ({
  id,
  teamId,
}: {
  id: string;
  teamId: string;
}) => {
  await apiOrThrow(`/teams/${teamId}/invite-links/${id}`, { method: 'DELETE' });
};
