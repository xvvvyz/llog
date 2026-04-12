import { useResolvedTeamIds } from '@/queries/use-resolved-team-ids';
import { db } from '@/utilities/db';
import { useMemo } from 'react';

export const useLogTags = ({
  query,
  teamIds,
}: {
  query?: string;
  teamIds?: string[];
} = {}) => {
  const resolvedTeamIds = useResolvedTeamIds(teamIds);

  const { data, isLoading } = db.useQuery(
    resolvedTeamIds.length
      ? {
          logTags: {
            $: {
              where: {
                teamId: { $in: resolvedTeamIds },
                ...(query && {
                  name: { $ilike: `%${query}%` },
                }),
              },
            },
          },
        }
      : null
  );

  const logTags = useMemo(
    // https://discord.com/channels/1031957483243188235/1376250736416919567
    () => data?.logTags?.sort((a, b) => a.order - b.order) ?? [],
    [data?.logTags]
  );

  const queryExistingTagId = useMemo(
    () =>
      query
        ? logTags.find((tag) => tag.name.toLowerCase() === query.toLowerCase())
            ?.id
        : undefined,
    [logTags, query]
  );

  return { data: logTags, isLoading, queryExistingTagId };
};
