import { db } from '@/utilities/db';
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

  const log = data?.logs?.[0];

  const tagIdsSet = React.useMemo(
    () => new Set(log?.tags?.map((tag) => tag.id)),
    [log?.tags]
  );

  const profileIdsSet = React.useMemo(
    () => new Set(log?.profiles?.map((profile) => profile.id)),
    [log?.profiles]
  );

  return { ...log, isLoading, tagIdsSet, profileIdsSet };
};
