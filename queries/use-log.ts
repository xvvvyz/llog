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

  const logTagIdsSet = useMemo(
    () => new Set(log?.logTags?.map((tag) => tag.id)),
    [log?.logTags]
  );

  return { ...log, isLoading, logTagIdsSet };
};
