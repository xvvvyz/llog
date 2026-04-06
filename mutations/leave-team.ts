import { switchTeam } from '@/mutations/switch-team';
import { api } from '@/utilities/api';

export const leaveTeam = async ({
  teamId,
  teams,
  activeTeamId,
  uiId,
}: {
  teamId: string;
  teams: { id: string }[];
  activeTeamId?: string;
  uiId?: string;
}) => {
  const nextTeam = teams.find((t) => t.id !== activeTeamId);
  if (nextTeam) await switchTeam({ teamId: nextTeam.id, uiId });
  await api(`/teams/${teamId}/leave`, { method: 'POST' });
};
