import { tagFields } from '@/domain/tags/query';
import type { TagType } from '@/features/tags/types/tag';
import { useResolvedTeamIds } from '@/features/teams/queries/use-resolved-team-ids';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

export const useTags = ({
  enabled = true,
  logId,
  teamIds,
  type = 'log',
}: {
  enabled?: boolean;
  logId?: string;
  teamIds?: string[];
  type?: TagType;
} = {}) => {
  const resolvedTeamIds = useResolvedTeamIds(teamIds);

  const { data, isLoading } = db.useQuery(
    enabled && resolvedTeamIds.length
      ? {
          tags: {
            $: {
              fields: tagFields,
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

  const queryKey = React.useMemo(
    () =>
      enabled && resolvedTeamIds.length
        ? `${type}:${logId ?? ''}:${resolvedTeamIds.join(',')}`
        : undefined,
    [enabled, logId, resolvedTeamIds, type]
  );

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);

  const tags = React.useMemo(
    // https://discord.com/channels/1031957483243188235/1376250736416919567
    () =>
      queryKey && hasCurrentResult && data?.tags
        ? [...data.tags].sort((a, b) => a.order - b.order)
        : [],
    [data?.tags, hasCurrentResult, queryKey]
  );

  return {
    data: tags,
    isLoading: !!queryKey && (isLoading || !hasCurrentResult),
  };
};
