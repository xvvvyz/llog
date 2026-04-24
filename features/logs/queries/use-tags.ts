import { useResolvedTeamIds } from '@/features/teams/queries/use-resolved-team-ids';
import { db } from '@/lib/db';
import * as React from 'react';

export const useTags = ({
  query,
  teamIds,
}: { query?: string; teamIds?: string[] } = {}) => {
  const resolvedTeamIds = useResolvedTeamIds(teamIds);

  const { data, isLoading } = db.useQuery(
    resolvedTeamIds.length
      ? {
          tags: {
            $: {
              where: {
                teamId: { $in: resolvedTeamIds },
                ...(query && { name: { $ilike: `%${query}%` } }),
              },
            },
          },
        }
      : null
  );

  const tags = React.useMemo(
    // https://discord.com/channels/1031957483243188235/1376250736416919567
    () => data?.tags?.sort((a, b) => a.order - b.order) ?? [],
    [data?.tags]
  );

  const queryExistingTagId = React.useMemo(
    () =>
      query
        ? tags.find((tag) => tag.name.toLowerCase() === query.toLowerCase())?.id
        : undefined,
    [tags, query]
  );

  return { data: tags, isLoading, queryExistingTagId };
};
