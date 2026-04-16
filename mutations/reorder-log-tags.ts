import { getActiveTeamId } from '@/queries/get-active-team-id';
import { db } from '@/utilities/db';
import { SortableFlexDragEndParams } from 'react-native-sortables';

export const reorderTags = async ({ order }: SortableFlexDragEndParams) => {
  const teamId = await getActiveTeamId();
  if (!teamId) return;

  const { data } = await db.queryOnce({
    tags: { $: { order: { order: 'asc' }, where: { team: teamId } } },
  });

  return db.transact(
    order(data.tags).map((tag, index) =>
      db.tx.tags[tag.id].update({ order: index })
    )
  );
};
