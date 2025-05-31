import { db } from '@/utilities/db';
import { useMemo } from 'react';

export const useLog = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          logs: {
            $: { where: { id: id } },
            logTags: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const log = data?.logs?.[0];

  const logTagIdsArray = useMemo(
    () => log?.logTags?.map((tag) => tag.id) ?? [],
    [log?.logTags]
  );

  const logTagIdsSet = useMemo(() => new Set(logTagIdsArray), [logTagIdsArray]);

  return {
    color: log?.color,
    id: log?.id,
    isLoading,
    logTagIdsArray,
    logTagIdsSet,
    name: log?.name,
  };
};
