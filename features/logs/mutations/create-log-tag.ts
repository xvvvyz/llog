import { getActiveTeamId } from '@/features/teams/queries/get-active-team-id';
import { db } from '@/lib/db';
import { id as generateId } from '@instantdb/react-native';

export const createLogTag = async ({
  id,
  logId,
  name,
  order,
  teamId,
}: {
  id?: string;
  logId?: string;
  name: string;
  order?: number;
  teamId?: string;
}) => {
  if (!logId) return;
  const resolvedTeamId = teamId ?? (await getActiveTeamId());
  if (!resolvedTeamId) return;
  const tagId = id ?? generateId();
  const trimmedName = name.trim();

  return db.transact(
    db.tx.tags[tagId]
      .update({
        name: trimmedName,
        order: order ?? -Date.now(),
        teamId: resolvedTeamId,
        type: 'log',
      })
      .link({ logs: logId, team: resolvedTeamId })
  );
};
