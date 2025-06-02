import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/db';
import { id as generateId } from '@instantdb/react-native';

export const createLogTag = async ({
  id,
  logId,
  name,
}: {
  id?: string;
  logId?: string;
  name: string;
}) => {
  if (!logId) return;
  const teamId = await getActiveTeamId();
  if (!teamId) return;

  const { data } = await db.queryOnce({
    logTags: { $: { order: { order: 'asc' }, where: { team: teamId } } },
  });

  const tagId = id ?? generateId();

  return db.transact([
    ...data.logTags.map((tag) =>
      db.tx.logTags[tag.id].update({ order: tag.order + 1 })
    ),
    db.tx.logTags[tagId]
      .update({ name, order: 0 })
      .link({ logs: logId, team: teamId }),
  ]);
};
