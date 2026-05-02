import type { TagType } from '@/features/tags/types/tag';
import { getActiveTeamId } from '@/features/teams/queries/get-active-team-id';
import { db } from '@/lib/db';
import type { SortableFlexDragEndParams } from 'react-native-sortables';

export const reorderTags = async ({
  logId,
  order,
  orderedIds,
  teamId,
  type = 'log',
}: Partial<Pick<SortableFlexDragEndParams, 'order'>> & {
  logId?: string;
  orderedIds?: string[];
  teamId?: string;
  type?: TagType;
}) => {
  const resolvedTeamId = teamId ?? (await getActiveTeamId());
  if (!resolvedTeamId) return;

  const { data } = await db.queryOnce({
    tags: {
      $: {
        order: { order: 'asc' },
        where: { team: resolvedTeamId, type, ...(logId && { logs: logId }) },
      },
    },
  });

  const orderedTags = orderedIds
    ? (() => {
        const orderById = new Map(
          orderedIds.map((id, index) => [id, index] as const)
        );

        return [...data.tags].sort(
          (a, b) =>
            (orderById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (orderById.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        );
      })()
    : order?.(data.tags);

  if (!orderedTags) return;

  return db.transact(
    orderedTags.map((tag, index) => db.tx.tags[tag.id].update({ order: index }))
  );
};
