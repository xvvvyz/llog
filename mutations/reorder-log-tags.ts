import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/ui/db';
import { SortableFlexDragEndParams } from 'react-native-sortables';

export const reorderLogTags = async ({ order }: SortableFlexDragEndParams) => {
  const teamId = await getActiveTeamId();
  if (!teamId) return;

  const { data } = await db.queryOnce({
    logTags: { $: { order: { order: 'asc' }, where: { team: teamId } } },
  });

  return db.transact(
    order(data.logTags).map((tag, index) =>
      db.tx.logTags[tag.id].update({ order: index })
    )
  );
};
