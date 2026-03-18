import { switchTeam } from '@/mutations/switch-team';
import { db } from '@/utilities/db';

export const leaveTeam = async ({
  roleId,
  teams,
  activeTeamId,
  uiId,
}: {
  roleId: string;
  teams: { id: string }[];
  activeTeamId?: string;
  uiId?: string;
}) => {
  const nextTeam = teams.find((t) => t.id !== activeTeamId);
  if (!nextTeam) return;
  await switchTeam({ teamId: nextTeam.id, uiId });
  return db.transact(db.tx.roles[roleId].delete());
};
