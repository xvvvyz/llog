import { db } from '@/lib/db';
import * as React from 'react';

export const useLog = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          logs: {
            $: { where: { id: id } },
            tags: { $: { fields: ['id'] } },
            profiles: { image: {} },
          },
        }
      : null
  );

  const logs = data?.logs ?? [];
  const log = logs.find((item) => item.id === id);
  const hasStaleResult = !!id && logs.length > 0 && !log;

  const tagIdsSet = React.useMemo(
    () => new Set(log?.tags?.map((tag) => tag.id)),
    [log?.tags]
  );

  const profileIdsSet = React.useMemo(
    () => new Set(log?.profiles?.map((profile) => profile.id)),
    [log?.profiles]
  );

  return {
    ...log,
    isLoading: isLoading || hasStaleResult,
    tagIdsSet,
    profileIdsSet,
  };
};
