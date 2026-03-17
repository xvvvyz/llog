import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';
import { useRef } from 'react';

export const useLogs = ({ query }: { query?: string } = {}) => {
  const ui = useUi();
  const prevDataRef = useRef<any[]>([]);

  const { data, isLoading } = db.useQuery(
    ui.activeTeamId
      ? {
          logs: {
            $: {
              order: { [ui.logsSortBy]: ui.logsSortDirection },
              where: {
                team: ui.activeTeamId,
                ...(!!ui.logsFilterByTagIdsArray.length && {
                  logTags: { $in: ui.logsFilterByTagIdsArray },
                }),
                ...(query && { name: { $ilike: `%${query}%` } }),
              },
            },
            logTags: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const logs = data?.logs ?? prevDataRef.current;
  if (data?.logs) prevDataRef.current = data.logs;

  return { data: logs, isLoading };
};
