import type { TagType } from '@/features/tags/types/tag';
import { useResolvedTeamIds } from '@/features/teams/queries/use-resolved-team-ids';
import { db } from '@/lib/db';
import * as React from 'react';

export const useTags = ({
  logId,
  teamIds,
  type = 'log',
}: { logId?: string; teamIds?: string[]; type?: TagType } = {}) => {
  const resolvedTeamIds = useResolvedTeamIds(teamIds);

  const { data, isLoading } = db.useQuery(
    resolvedTeamIds.length
      ? {
          tags: {
            $: {
              where: {
                teamId: { $in: resolvedTeamIds },
                type,
                ...(logId && { logs: logId }),
              },
            },
          },
        }
      : null
  );

  const tags = React.useMemo(
    // https://discord.com/channels/1031957483243188235/1376250736416919567
    () => (data?.tags ? [...data.tags].sort((a, b) => a.order - b.order) : []),
    [data?.tags]
  );

  return { data: tags, isLoading };
};
