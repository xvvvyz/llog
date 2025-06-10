import { db } from '@/utilities/ui/db';

export const useRecords = ({ logId }: { logId?: string }) => {
  const { data, isLoading } = db.useQuery(
    logId
      ? {
          records: {
            $: {
              order: { date: 'desc' },
              where: { log: logId },
            },
            author: {},
          },
        }
      : null
  );

  return { data: data?.records ?? [], isLoading };
};
