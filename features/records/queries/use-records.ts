import * as recordIdentity from '@/domain/records/identity-fields';
import { recordListItemQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { useDelayedTrue } from '@/hooks/use-delayed-true';
import { useLoadNextPage } from '@/hooks/use-load-next-page';
import { db } from '@/lib/db';
import * as React from 'react';
import * as recordCache from './record-cache';

const RECORDS_PAGE_SIZE = 25;
const EMPTY_STATE_DELAY_MS = 400;

const compareByDateDesc = (
  a: { date?: Date | string | number | null },
  b: { date?: Date | string | number | null }
) => {
  const aTime = a.date ? new Date(a.date).getTime() : 0;
  const bTime = b.date ? new Date(b.date).getTime() : 0;
  return bTime - aTime;
};

export const useRecords = ({ logId }: { logId?: string }) => {
  const outbox = useOutbox();
  const profile = useProfile();

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

  React.useEffect(() => {
    if (!logId || !hasCurrentPinnedResult || !hasCurrentPagedResult) return;

    const visibleRecordIds = new Set(
      [...pinnedRecords, ...pagedRecords].map((record) => record.id)
    );

    const completedSubmissionIds = outbox.submissions
      .filter(
        (
          submission
        ): submission is Extract<
          (typeof outbox.submissions)[number],
          { type: 'record' }
        > =>
          submission.type === 'record' &&
          submission.logId === logId &&
          submission.status === 'complete' &&
          visibleRecordIds.has(submission.contentId)
      )
      .map((submission) => submission.id);

    for (const submissionId of completedSubmissionIds) {
      void outboxStore.clearCompletedSubmission(submissionId);
    }
  }, [
    hasCurrentPagedResult,
    hasCurrentPinnedResult,
    logId,
    outbox.submissions,
    pagedRecords,
    pinnedRecords,
  ]);

  const queuedRecordPins = outbox.recordPins;

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

    const records = [
      ...pinned.sort(compareByDateDesc),
      ...unpinned.sort(compareByDateDesc),
    ].map((record) => (record.files ? record : { ...record, files: [] }));

    const pendingRecords = outbox.submissions
      .filter(
        (
          submission
        ): submission is Extract<
          (typeof outbox.submissions)[number],
          { type: 'record' }
        > =>
          submission.type === 'record' &&
          submission.logId === logId &&
          pendingEntries.isActiveQueuedSubmission(submission)
      )
      .map((submission) =>
        pendingEntries.queuedRecordToEntry({
          attachments: outbox.attachments,
          profile,
          submission,
        })
      );

    const mergedRecords = pendingEntries
      .mergePendingRecords(records, pendingRecords)
      .map((record) => {
        const existingReplyIds = new Set(
          (record.replies ?? []).map((reply) => reply.id).filter(Boolean)
        );

        const pendingReplies = outbox.submissions
          .filter(
            (
              submission
            ): submission is Extract<
              (typeof outbox.submissions)[number],
              { type: 'reply' }
            > =>
              submission.type === 'reply' &&
              submission.recordId === record.id &&
              pendingEntries.isActiveQueuedSubmission(submission) &&
              !existingReplyIds.has(submission.contentId)
          )
          .map((submission) =>
            pendingEntries.queuedReplyToEntry({
              attachments: outbox.attachments,
              profile,
              submission,
            })
          );

        return pendingReplies.length
          ? {
              ...record,
              replies: pendingEntries.mergePendingReplies(
                record.replies ?? [],
                pendingReplies
              ),
            }
          : record;
      })
      .map((record) => {
        const queuedPin = queuedRecordPins.find(
          (recordPin) => recordPin.recordId === record.id
        );

        return queuedPin ? { ...record, isPinned: queuedPin.isPinned } : record;
      });

    const isPinnedRecord = (record: (typeof mergedRecords)[number]) =>
      'isPinned' in record && !!record.isPinned;

    return [
      ...mergedRecords.filter(isPinnedRecord).sort(compareByDateDesc),
      ...mergedRecords
        .filter((record) => !isPinnedRecord(record))
        .sort(compareByDateDesc),
    ];
  }, [
    logId,
    outbox.attachments,
    outbox.submissions,
    pagedRecords,
    pinnedRecords,
    profile,
    queuedRecordPins,
  ]);

  React.useEffect(() => {
    recordCache.cacheRecords(
      data.map((record) => {
        const recordLog = 'log' in record ? record.log : undefined;

        return logId && !recordLog?.id
          ? { ...record, log: { ...(recordLog ?? {}), id: logId } }
          : record;
      })
    );
  }, [data, logId]);

  const currentCanLoadNextPage =
    !!logId && hasCurrentPagedResult && canLoadNextPage;

  const handleLoadNextPage = useLoadNextPage({
    canLoadNextPage: currentCanLoadNextPage,
    itemCount: pagedRecords.length,
    loadNextPage,
  });

  const hasRecords = data.length > 0;

  const isQueryLoading =
    !!logId &&
    !hasRecords &&
    (pinnedLoading || pagedLoading || !hasPinnedResult || !hasPagedResult);

  const canShowEmptyResult = !!logId && !isQueryLoading && !hasRecords;

  const isEmptyReady = useDelayedTrue(canShowEmptyResult, {
    delayMs: EMPTY_STATE_DELAY_MS,
    resetKey: logId,
  });

  return {
    canLoadNextPage: currentCanLoadNextPage,
    data,
    isEmptyReady,
    isLoading: isQueryLoading || (!!logId && !hasRecords && !isEmptyReady),
    loadNextPage: handleLoadNextPage,
  };
};
