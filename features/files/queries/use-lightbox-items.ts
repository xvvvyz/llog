import { visibleFileQuery } from '@/domain/files/query';
import { useConnectivity } from '@/features/offline/connectivity';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as pendingEntries from '@/features/offline/pending-entries';
import { type FileItem } from '@/features/files/types/file';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

const byOrder = (a: FileItem, b: FileItem) => (a.order ?? 0) - (b.order ?? 0);

const getVisualMedia = (files: FileItem[]) =>
  files
    .filter((item) => item.type === 'image' || item.type === 'video')
    .sort(byOrder);

export const useLightboxMedia = ({
  mediaId,
  recordId,
}: {
  mediaId?: string;
  recordId?: string;
}) => {
  const { isOffline } = useConnectivity();
  const outbox = useOutbox();

  const { data, isLoading } = db.useQuery(
    recordId
      ? {
          records: {
            $: { fields: ['id', 'teamId'], where: { id: recordId } },
            files: visibleFileQuery,
            log: { team: { $: { fields: ['id'] } } },
            replies: { files: visibleFileQuery },
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(recordId, data);

  const record =
    recordId && hasCurrentResult
      ? data?.records?.find((item) => item.id === recordId)
      : undefined;

  const pendingMedia = React.useMemo(() => {
    if (!recordId) return [];

    const activeSubmissionIds = new Set(
      outbox.submissions
        .filter((submission) => {
          if (!pendingEntries.isActiveQueuedSubmission(submission)) {
            return false;
          }

          return submission.type === 'record'
            ? submission.contentId === recordId
            : submission.recordId === recordId;
        })
        .map((submission) => submission.id)
    );

    return getVisualMedia(
      outbox.attachments
        .filter(
          (attachment) =>
            (attachment.submissionId
              ? activeSubmissionIds.has(attachment.submissionId)
              : attachment.recordId === recordId) &&
            (attachment.type === 'image' || attachment.type === 'video')
        )
        .map(pendingEntries.queuedAttachmentToFileItem)
    );
  }, [outbox.attachments, outbox.submissions, recordId]);

  const media = React.useMemo(() => {
    if (!mediaId) return [];
    const recordMedia = getVisualMedia(record?.files ?? []);
    if (recordMedia.some((item) => item.id === mediaId)) return recordMedia;

    for (const reply of record?.replies ?? []) {
      const replyMedia = getVisualMedia(reply.files ?? []);
      if (replyMedia.some((item) => item.id === mediaId)) return replyMedia;
    }

    if (pendingMedia.some((item) => item.id === mediaId)) return pendingMedia;
    return [];
  }, [mediaId, pendingMedia, record]);

  return {
    isLoading:
      !!recordId &&
      !isOffline &&
      !pendingMedia.some((item) => item.id === mediaId) &&
      (isLoading || !hasCurrentResult),
    media,
    teamId: record?.log?.team?.id ?? record?.teamId,
  };
};
