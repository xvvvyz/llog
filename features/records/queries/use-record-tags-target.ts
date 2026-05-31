import { recordTagTargetQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as pendingEntries from '@/features/offline/pending-entries';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import type { SheetPayload } from '@/lib/sheet-names';

type RecordTagsSheetPayload = SheetPayload<'record-tags'>;

const getPayloadLogId = (payload?: RecordTagsSheetPayload) => {
  const logId = payload?.logId;
  return typeof logId === 'string' && logId.trim() ? logId : undefined;
};

const getPayloadContext = (payload?: RecordTagsSheetPayload) => {
  return {
    authorId:
      typeof payload?.authorId === 'string' && payload.authorId.trim()
        ? payload.authorId
        : undefined,
    tags: Array.isArray(payload?.tags) ? payload.tags : [],
    teamId:
      typeof payload?.teamId === 'string' && payload.teamId.trim()
        ? payload.teamId
        : undefined,
  };
};

export const useRecordTagsTarget = ({
  payload,
  recordId,
}: {
  payload?: RecordTagsSheetPayload;
  recordId?: string;
}) => {
  const payloadLogId = getPayloadLogId(payload);
  const payloadContext = getPayloadContext(payload);
  const outbox = useOutbox();
  const profile = useProfile();

  const { data, isLoading } = db.useQuery(
    recordId
      ? { records: { $: { where: { id: recordId } }, ...recordTagTargetQuery } }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(recordId, data);
  const records = recordId && hasCurrentResult ? (data?.records ?? []) : [];
  const record = records.find((item) => item.id === recordId);

  const pendingRecord = outbox.submissions.find(
    (
      submission
    ): submission is Extract<
      (typeof outbox.submissions)[number],
      { type: 'record' }
    > =>
      submission.type === 'record' &&
      submission.contentId === recordId &&
      pendingEntries.isActiveQueuedSubmission(submission)
  );

  const queuedDraft = outbox.drafts.find(
    (draft) => draft.type === 'record' && draft.contentId === recordId
  );

  const resolvedRecord =
    record ??
    (pendingRecord
      ? pendingEntries.queuedRecordToEntry({
          attachments: outbox.attachments,
          profile,
          submission: pendingRecord,
        })
      : queuedDraft?.type === 'record'
        ? {
            author: { id: payloadContext.authorId ?? profile.id },
            id: queuedDraft.contentId,
            log: { id: payloadLogId },
            status: 'draft',
            tags: queuedDraft.tagsUpdated
              ? queuedDraft.tags
              : payloadContext.tags,
            teamId: payloadContext.teamId,
          }
        : recordId && payloadContext.teamId
          ? {
              author: { id: payloadContext.authorId ?? profile.id },
              id: recordId,
              log: { id: payloadLogId },
              status: 'draft',
              tags: payloadContext.tags,
              teamId: payloadContext.teamId,
            }
          : undefined);

  const hasStaleResult =
    !!recordId && hasCurrentResult && records.length > 0 && !record;

  return {
    isLoading:
      !!recordId &&
      !resolvedRecord &&
      (isLoading || !hasCurrentResult || hasStaleResult),
    logColor: record?.log?.color,
    logId: resolvedRecord?.log?.id ?? payloadLogId,
    record: resolvedRecord,
    teamId: resolvedRecord?.teamId,
  };
};
