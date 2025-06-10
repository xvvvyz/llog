import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/ui/db';
import { useMemo } from 'react';

export const useLogTags = ({ query }: { query?: string } = {}) => {
  const ui = useUi();

  const { data, isLoading } = db.useQuery(
    ui.activeTeamId
      ? {
          logTags: {
            $: {
              where: {
                team: ui.activeTeamId,
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
