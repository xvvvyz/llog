import { useResolvedTeamIds } from '@/queries/use-resolved-team-ids';
import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import { useRef } from 'react';

export const useLogs = ({
  query,
  teamIds,
}: {
  query?: string;
  teamIds?: string[];
} = {}) => {
  const ui = useUi();
  const prevDataRef = useRef<any[]>([]);
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
            logTags: { $: { fields: ['id'] } },
            profiles: { image: {} },
          },
        }
      : null
  );

  const logs = data?.logs ?? prevDataRef.current;
  if (data?.logs) prevDataRef.current = data.logs;
  return { data: logs, isLoading };
};
