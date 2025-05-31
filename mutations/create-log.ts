import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const createLog = async ({
  color = 11,
  name = 'New log',
}: {
  color?: number;
  name?: string;
} = {}) => {
  const teamId = await getActiveTeamId();
  if (!teamId) return;
  const logId = id();

  await db.transact(
    db.tx.logs[logId].update({ color, name }).link({ team: teamId })
  );

  return logId;
};
