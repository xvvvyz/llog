import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/ui/db';

export const useLogs = ({ query }: { query?: string } = {}) => {
  const ui = useUi();

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

  return { data: data?.logs ?? [], isLoading };
};
