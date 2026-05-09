import { logTagsQuery } from '@/domain/tags/query';
import { useUi } from '@/features/account/queries/use-ui';
import { useResolvedTeamIds } from '@/features/teams/queries/use-resolved-team-ids';
import { db } from '@/lib/db';
import * as React from 'react';

export const useLogs = ({
  query,
  teamIds,
}: { query?: string; teamIds?: string[] } = {}) => {
  const ui = useUi();
  const prevDataRef = React.useRef<any[]>([]);
  const resolvedTeamIds = useResolvedTeamIds(teamIds);

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

  const logs = data?.logs ?? prevDataRef.current;
  if (data?.logs) prevDataRef.current = data.logs;
  return { data: logs, isLoading };
};
