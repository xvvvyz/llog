import { recordTagTargetQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
import { useConnectivity } from '@/features/offline/connectivity';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as pendingEntries from '@/features/offline/pending-entries';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

const getPayloadLogId = (payload: unknown) => {
  if (!payload || typeof payload !== 'object' || !('logId' in payload)) return;
  const logId = (payload as { logId?: unknown }).logId;
  return typeof logId === 'string' && logId.trim() ? logId : undefined;
};

const getPayloadContext = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return {};

  const value = payload as {
    authorId?: unknown;
    tags?: unknown;
    teamId?: unknown;
  };

  return {
    authorId:
      typeof value.authorId === 'string' && value.authorId.trim()
        ? value.authorId
        : undefined,
    tags: Array.isArray(value.tags) ? value.tags : [],
    teamId:
      typeof value.teamId === 'string' && value.teamId.trim()
        ? value.teamId
        : undefined,
  };
};

export const useRecordTagsTarget = ({
  payload,
  recordId,
}: {
  payload: unknown;
  recordId?: string;
}) => {
  const payloadLogId = getPayloadLogId(payload);
  const payloadContext = getPayloadContext(payload);
  const { isOffline } = useConnectivity();
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
      ? {
          author: { id: pendingRecord.authorId ?? profile.id },
          id: pendingRecord.contentId,
          log: { id: pendingRecord.logId },
          localStatus: pendingRecord.status === 'error' ? 'error' : 'pending',
          tags: pendingRecord.tags,
          teamId: pendingRecord.teamId,
        }
      : queuedDraft?.type === 'record'
        ? {
            author: { id: payloadContext.authorId ?? profile.id },
            id: queuedDraft.contentId,
            isDraft: true,
            log: { id: payloadLogId },
            tags: queuedDraft.tagsUpdated
              ? queuedDraft.tags
              : payloadContext.tags,
            teamId: payloadContext.teamId,
          }
        : recordId && payloadContext.teamId
          ? {
              author: { id: payloadContext.authorId ?? profile.id },
              id: recordId,
              isDraft: true,
              log: { id: payloadLogId },
              tags: payloadContext.tags,
              teamId: payloadContext.teamId,
            }
          : undefined);

  const hasStaleResult =
    !!recordId && hasCurrentResult && records.length > 0 && !record;

  return {
    isLoading:
      !!recordId &&
      !pendingRecord &&
      !isOffline &&
      (isLoading || !hasCurrentResult || hasStaleResult),
    logColor: record?.log?.color,
    logId: resolvedRecord?.log?.id ?? payloadLogId,
    record: resolvedRecord,
    teamId: resolvedRecord?.teamId,
  };
};
