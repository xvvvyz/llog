import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const createLog = ({ teamId }: { teamId?: string }) => {
  if (!teamId) return;
  const logId = id();

  db.transact(
    db.tx.logs[logId]
      .update({ color: 6, name: 'New log' })
      .link({ team: teamId })
  );

  return logId;
};
