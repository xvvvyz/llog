import { recordDetailQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
import type { FileItem } from '@/features/files/types/file';
import { useConnectivity } from '@/features/offline/connectivity';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import type { EntryRecord } from '@/features/records/types/entry';
import type { Link } from '@/features/records/types/link';
import type { Log } from '@/features/logs/types/log';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';
import { useCachedRecord } from './record-cache';

type RecordLog = Partial<Pick<Log, 'color' | 'id' | 'name'>>;

export type UseRecordResult = EntryRecord & {
  files: FileItem[];
  id?: string;
  isLoading: boolean;
  links: Link[];
  log?: RecordLog;
  replies: EntryRecord[];
  teamId?: string;
};

export const useRecord = ({ id }: { id?: string }): UseRecordResult => {
  const outbox = useOutbox();
  const profile = useProfile();
  const { isOffline } = useConnectivity();

  const { data, isLoading } = db.useQuery(
    id ? { records: { $: { where: { id } }, ...recordDetailQuery } } : null
  );

  const hasCurrentResult = useCurrentQueryResult(id, data);
  const records = id && hasCurrentResult ? (data?.records ?? []) : [];
  const record = records.find((item) => item.id === id);
  const cachedRecord = useCachedRecord(id);

  const hasStaleResult =
    !!id && hasCurrentResult && records.length > 0 && !record;

  const pendingRecord = outbox.submissions.find(
    (
      submission
    ): submission is Extract<
      (typeof outbox.submissions)[number],
      { type: 'record' }
    > =>
      submission.type === 'record' &&
      submission.contentId === id &&
      pendingEntries.isActiveQueuedSubmission(submission)
  );

  React.useEffect(() => {
    if (!record?.id || pendingRecord?.status !== 'complete') return;
    void outboxStore.clearCompletedSubmission(pendingRecord.id);
  }, [pendingRecord?.id, pendingRecord?.status, record?.id]);

  React.useEffect(() => {
    if (!record?.replies?.length) return;

    const liveReplyIds = new Set(
      record.replies.map((reply) => reply.id).filter(Boolean)
    );

    for (const submission of outbox.submissions) {
      if (
        submission.type === 'reply' &&
        submission.recordId === id &&
        submission.status === 'complete' &&
        liveReplyIds.has(submission.contentId)
      ) {
        void outboxStore.clearCompletedSubmission(submission.id);
      }
    }
  }, [id, outbox.submissions, record?.replies]);

  const resolvedRecord = (record ??
    cachedRecord ??
    (pendingRecord
      ? pendingEntries.queuedRecordToEntry({
          attachments: outbox.attachments,
          profile,
          submission: pendingRecord,
        })
      : undefined)) as (EntryRecord & { log?: RecordLog }) | undefined;

  const pendingReplies = outbox.submissions
    .filter(
      (
        submission
      ): submission is Extract<
        (typeof outbox.submissions)[number],
        { type: 'reply' }
      > =>
        submission.type === 'reply' &&
        submission.recordId === id &&
        pendingEntries.isActiveQueuedSubmission(submission)
    )
    .map((submission) =>
      pendingEntries.queuedReplyToEntry({
        attachments: outbox.attachments,
        profile,
        submission,
      })
    );

  const replies = pendingEntries
    .mergePendingReplies(
      ((resolvedRecord?.replies ?? []) as EntryRecord[]).map((reply) => ({
        ...reply,
        files: reply.files ?? [],
      })),
      pendingReplies
    )
    .map((reply) => ({ ...reply, files: reply.files ?? [] }));

  const files = (resolvedRecord?.files ?? []) as FileItem[];
  const links = (resolvedRecord?.links ?? []) as Link[];

  return {
    ...(resolvedRecord ?? {}),
    links,
    replies,
    files,
    isLoading:
      !!id &&
      !pendingRecord &&
      !isOffline &&
      (isLoading || !hasCurrentResult || hasStaleResult),
  };
};
