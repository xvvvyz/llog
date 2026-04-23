import { useLoadNextPage } from '@/hooks/use-load-next-page';
import { db } from '@/lib/db';

const RECORDS_PAGE_SIZE = 25;

const compareByDateDesc = (
  a: { date?: Date | string | number | null },
  b: { date?: Date | string | number | null }
) => {
  const aTime = a.date ? new Date(a.date).getTime() : 0;
  const bTime = b.date ? new Date(b.date).getTime() : 0;
  return bTime - aTime;
};

export const useRecords = ({ logId }: { logId?: string }) => {
  const { data: pinnedData, isLoading: pinnedLoading } = db.useQuery(
    logId
      ? {
          records: {
            $: {
              order: { date: 'desc' },
              where: { isDraft: false, isPinned: true, log: logId },
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

  const {
    data: pagedData,
    isLoading: pagedLoading,
    canLoadNextPage,
    loadNextPage,
  } = db.useInfiniteQuery(
    logId
      ? {
          records: {
            $: {
              limit: RECORDS_PAGE_SIZE,
              order: { date: 'desc' },
              where: { isDraft: false, log: logId },
            },
            author: { image: {} },
            replies: {
              $: { fields: ['id'], where: { isDraft: { $not: true } } },
            },
            media: {},
            reactions: { author: {} },
          },
        }
      : (null as never)
  );

  const pinnedRecords = pinnedData?.records ?? [];
  const pagedRecords = pagedData?.records ?? [];
  const merged = new Map<string, (typeof pinnedRecords)[number]>();

  for (const record of pinnedRecords) {
    merged.set(record.id, record);
  }

  for (const record of pagedRecords) {
    merged.set(record.id, record);
  }

  const records = Array.from(merged.values());

  const data = [
    ...records.filter((record) => !!record.isPinned).sort(compareByDateDesc),
    ...records.filter((record) => !record.isPinned).sort(compareByDateDesc),
  ];

  const handleLoadNextPage = useLoadNextPage({
    canLoadNextPage: !!logId && canLoadNextPage,
    itemCount: pagedRecords.length,
    loadNextPage,
  });

  return {
    canLoadNextPage: logId ? canLoadNextPage : false,
    data,
    isLoading: !!logId && (pinnedLoading || pagedLoading),
    loadNextPage: handleLoadNextPage,
  };
};
