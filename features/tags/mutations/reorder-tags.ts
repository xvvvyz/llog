import type { TagType } from '@/features/tags/types/tag';
import { getActiveTeamId } from '@/features/teams/queries/get-active-team-id';
import { db } from '@/lib/db';
import { applyOrderedIds, reorderItems } from '@/lib/reorder-items';

export const reorderTags = async ({
  logId,
  orderedIds,
  teamId,
  type = 'log',
}: {
  logId?: string;
  orderedIds: string[];
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

  const orderedTags = applyOrderedIds(data.tags, orderedIds);

  return reorderItems(orderedTags, (id, order) =>
    db.tx.tags[id].update({ order })
  );
};
