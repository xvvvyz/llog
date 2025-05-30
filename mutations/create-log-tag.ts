import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/db';
import { id } from '@instantdb/react-native';

export const createLogTag = async ({
  logId,
  name,
}: {
  logId?: string;
  name: string;
}) => {
  if (!logId) return;
  const teamId = await getActiveTeamId();
  if (!teamId) return;
  const tagId = id();

  const { data } = await db.queryOnce({
    logTags: { $: { order: { order: 'asc' }, where: { team: teamId } } },
  });

  db.transact([
    ...data.logTags.map((tag) =>
      db.tx.logTags[tag.id].update({ order: tag.order + 1 })
    ),
    db.tx.logTags[tagId]
      .update({ name, order: 0 })
      .link({ logs: logId, team: teamId }),
  ]);

  return tagId;
};
