import { SortBy } from '@/components/log-list-actions';
import { SortDirection } from '@/components/ui/dropdown-menu';
import { db } from '@/utilities/db';
import { useMemo } from 'react';

export const useUi = () => {
  const { user } = db.useAuth();

  const { data, isLoading } = db.useQuery(
    user
      ? {
          ui: {
            $: { where: { user: user.id } },
            logTags: { $: { fields: ['id'] } },
            team: {},
          },
        }
      : null
  );

  const ui = data?.ui?.[0];

  const logsFilterByTagIdsArray = useMemo(
    () => ui?.logTags?.map((tag) => tag.id) ?? [],
    [ui?.logTags]
  );

  const logsFilterByTagIdsSet = useMemo(
    () => new Set(logsFilterByTagIdsArray),
    [logsFilterByTagIdsArray]
  );

  return {
    activeTeamId: ui?.team?.id,
    isLoading,
    logsFilterByTagIdsArray,
    logsFilterByTagIdsSet,
    logsSortBy: (ui?.logsSortBy ?? 'serverCreatedAt') as SortBy,
    logsSortDirection: (ui?.logsSortDirection ?? 'desc') as SortDirection,
  };
};
