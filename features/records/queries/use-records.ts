import * as recordIdentity from '@/domain/records/identity-fields';
import { recordListItemQuery } from '@/domain/records/query';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { useLoadNextPage } from '@/hooks/use-load-next-page';
import { db } from '@/lib/db';
import * as React from 'react';

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
              where: {
                ...recordIdentity.getPublishedLogRecordWhere(logId),
                isPinned: true,
              },
            },
            ...recordListItemQuery,
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
              where: recordIdentity.getPublishedLogRecordWhere(logId),
            },
            ...recordListItemQuery,
          },
        }
      : (null as never)
  );

  const hasCurrentPinnedResult = useCurrentQueryResult(logId, pinnedData);
  const hasCurrentPagedResult = useCurrentQueryResult(logId, pagedData);

  const pinnedRecords = React.useMemo(
    () => (logId && hasCurrentPinnedResult ? (pinnedData?.records ?? []) : []),
    [hasCurrentPinnedResult, logId, pinnedData?.records]
  );

  const pagedRecords = React.useMemo(
    () => (logId && hasCurrentPagedResult ? (pagedData?.records ?? []) : []),
    [hasCurrentPagedResult, logId, pagedData?.records]
  );

  const hasPinnedResult = !logId || hasCurrentPinnedResult;
  const hasPagedResult = !logId || hasCurrentPagedResult;

  const data = React.useMemo(() => {
    const merged = new Map<string, (typeof pinnedRecords)[number]>();

    for (const record of pinnedRecords) {
      merged.set(record.id, record);
    }

    for (const record of pagedRecords) {
      merged.set(record.id, record);
    }

    type RecordListItem = (typeof pinnedRecords)[number];
    const pinned: RecordListItem[] = [];
    const unpinned: RecordListItem[] = [];

    for (const record of merged.values()) {
      if (record.isPinned) pinned.push(record);
      else unpinned.push(record);
    }

    return [
      ...pinned.sort(compareByDateDesc),
      ...unpinned.sort(compareByDateDesc),
    ].map((record) => (record.files ? record : { ...record, files: [] }));
  }, [pagedRecords, pinnedRecords]);

  const currentCanLoadNextPage =
    !!logId && hasCurrentPagedResult && canLoadNextPage;

  const handleLoadNextPage = useLoadNextPage({
    canLoadNextPage: currentCanLoadNextPage,
    itemCount: pagedRecords.length,
    loadNextPage,
  });

  return {
    canLoadNextPage: currentCanLoadNextPage,
    data,
    isLoading:
      !!logId &&
      (pinnedLoading || pagedLoading || !hasPinnedResult || !hasPagedResult),
    loadNextPage: handleLoadNextPage,
  };
};
