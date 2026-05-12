import { getActiveTeamId } from '@/features/teams/queries/get-active-team-id';
import { getPrependTagOrderTransactions } from '@/features/tags/mutations/prepend-tag-order';
import { db } from '@/lib/db';
import type { Color } from '@/theme/spectrum';
import { id as generateId } from '@instantdb/react-native';

export const createLogTag = async ({
  color,
  id,
  logId,
  name,
  teamId,
}: {
  color: Color;
  id?: string;
  logId?: string;
  name: string;
  teamId?: string;
}) => {
  if (!logId) return;
  const resolvedTeamId = teamId ?? (await getActiveTeamId());
  if (!resolvedTeamId) return;
  const tagId = id ?? generateId();
  const trimmedName = name.trim();

  const orderTransactions = await getPrependTagOrderTransactions({
    tagId,
    teamId: resolvedTeamId,
    type: 'log',
  });

  return db.transact([
    db.tx.tags[tagId]
      .update({
        color,
        name: trimmedName,
        order: 0,
        teamId: resolvedTeamId,
        type: 'log',
      })
      .link({ logs: logId, team: resolvedTeamId }),
    ...orderTransactions,
  ]);
};
