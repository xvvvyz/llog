import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/ui/db';

export const reorderLogTags = async ({
  fromIndex,
  toIndex,
}: {
  fromIndex: number;
  toIndex: number;
}) => {
  const teamId = await getActiveTeamId();
  if (!teamId) return;

  const { data } = await db.queryOnce({
    logTags: { $: { order: { order: 'asc' }, where: { team: teamId } } },
  });

  const newTags = [...data.logTags];
  const [reorderedTag] = newTags.splice(fromIndex, 1);
  newTags.splice(toIndex, 0, reorderedTag);

  return db.transact(
    newTags.map((tag, index) => db.tx.logTags[tag.id].update({ order: index }))
  );
};
