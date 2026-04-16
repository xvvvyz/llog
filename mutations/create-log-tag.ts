import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/db';
import { id as generateId } from '@instantdb/react-native';

export const createTag = async ({
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
    tags: { $: { order: { order: 'asc' }, where: { team: teamId } } },
  });

  const tagId = id ?? generateId();

  return db.transact([
    ...data.tags.map((tag) =>
      db.tx.tags[tag.id].update({ order: tag.order + 1 })
    ),
    db.tx.tags[tagId]
      .update({ name, order: 0, teamId })
      .link({ logs: logId, team: teamId }),
  ]);
};
