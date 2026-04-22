import { db } from '@/lib/db';
import * as React from 'react';

export const useRecords = ({ logId }: { logId?: string }) => {
  const { data, isLoading } = db.useQuery(
    logId
      ? {
          records: {
            $: {
              order: { date: 'desc' },
              where: { log: logId, isDraft: false },
            },
            author: { image: {} },
            replies: {
              $: { fields: ['id'], where: { isDraft: { $not: true } } },
            },
            media: {},
            reactions: { author: {} },
          },
        }
      : null
  );

  const records = data?.records ?? [];

  const sorted = React.useMemo(
    () =>
      [...records].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      }),
    [records]
  );

  return { data: sorted, isLoading };
};
