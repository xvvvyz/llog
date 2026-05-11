import { logTagsQuery } from '@/domain/tags/query';
import { useUi } from '@/features/account/queries/use-ui';
import { Log } from '@/features/logs/types/log';
import { Tag } from '@/features/tags/types/tag';
import { useResolvedTeamIds } from '@/features/teams/queries/use-resolved-team-ids';
import { db } from '@/lib/db';
import * as React from 'react';

type LogListItem = Log & {
  profiles?: {
    avatarSeedId?: string;
    id: string;
    image?: { uri: string };
    name: string;
  }[];
  tags: Pick<Tag, 'id'>[];
};

export const useLogs = ({
  query,
  teamIds,
}: { query?: string; teamIds?: string[] } = {}) => {
  const ui = useUi();
  const prevDataRef = React.useRef<LogListItem[]>([]);
  const prevRequestKeyRef = React.useRef('');
  const resolvedTeamIds = useResolvedTeamIds(teamIds);

  const requestKey = React.useMemo(
    () =>
      JSON.stringify({
        query: query ?? '',
        sortBy: ui.logsSortBy,
        sortDirection: ui.logsSortDirection,
        teamIds: resolvedTeamIds,
      }),
    [query, resolvedTeamIds, ui.logsSortBy, ui.logsSortDirection]
  );

  const { data, isLoading } = db.useQuery(
    resolvedTeamIds.length
      ? {
          logs: {
            $: {
              order: { [ui.logsSortBy]: ui.logsSortDirection },
              where: {
                teamId: { $in: resolvedTeamIds },
                ...(query && { name: { $ilike: `%${query}%` } }),
              },
            },
            tags: logTagsQuery,
            profiles: { image: {} },
          },
        }
      : null
  );

  const canUsePreviousData = prevRequestKeyRef.current === requestKey;

  const logs = (data?.logs ??
    (canUsePreviousData ? prevDataRef.current : [])) as LogListItem[];

  if (data?.logs) {
    prevDataRef.current = data.logs as LogListItem[];
    prevRequestKeyRef.current = requestKey;
  }

  return { data: logs, isLoading };
};
