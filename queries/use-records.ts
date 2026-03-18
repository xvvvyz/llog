import { db } from '@/utilities/db';

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
            comments: {
              $: { fields: ['id'], where: { isDraft: { $not: true } } },
            },
            media: {},
            reactions: { author: {} },
          },
        }
      : null
  );

  return { data: data?.records ?? [], isLoading };
};
