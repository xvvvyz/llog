import { db } from '@/utilities/db';
import * as React from 'react';

export const useLog = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          logs: {
            $: { where: { id: id } },
            logTags: { $: { fields: ['id'] } },
            profiles: { image: {} },
          },
        }
      : null
  );

  const log = data?.logs?.[0];

  const logTagIdsSet = React.useMemo(
    () => new Set(log?.logTags?.map((tag) => tag.id)),
    [log?.logTags]
  );

  const profileIdsSet = React.useMemo(
    () => new Set(log?.profiles?.map((profile) => profile.id)),
    [log?.profiles]
  );

  return { ...log, isLoading, logTagIdsSet, profileIdsSet };
};
