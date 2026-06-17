import { visibleFileQuery } from '@/domain/files/query';
import * as recordStatus from '@/domain/records/status';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as visualMedia from '@/features/files/lib/visual-media';
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
  const outbox = useOutbox();

  const { data, isLoading } = db.useQuery(
    recordId
      ? {
          records: {
            $: { fields: ['id', 'status', 'teamId'], where: { id: recordId } },
            files: visibleFileQuery,
            log: { team: { $: { fields: ['id'] } } },
            replies: {
              $: { fields: ['id', 'isDraft'] },
              files: visibleFileQuery,
            },
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

    const localUriById = new Map(
      pendingMedia
        .filter((item) => !!item.uri)
        .map((item) => [item.id, item.uri as string])
    );

    // Swap a still-encoding video's stream-pending uri for its local source so
    // the carousel can preview it while it uploads/processes.
    const withLocalPreview = (files: FileItem[]) =>
      files.map((file) => {
        const localUri = localUriById.get(file.id);

        return file.type === 'video' &&
          localUri &&
          !visualMedia.isLocalPreviewableUri(file.uri)
          ? ({ ...file, uri: localUri } as FileItem)
          : file;
      });

    const recordMedia = withLocalPreview(getVisualMedia(record?.files ?? []));
    if (recordMedia.some((item) => item.id === mediaId)) return recordMedia;

    for (const reply of record?.replies ?? []) {
      const replyMedia = withLocalPreview(getVisualMedia(reply.files ?? []));
      if (replyMedia.some((item) => item.id === mediaId)) return replyMedia;
    }

    if (pendingMedia.some((item) => item.id === mediaId)) return pendingMedia;
    return [];
  }, [mediaId, pendingMedia, record]);

  const shareableMediaIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (!recordStatus.recordIsPublished(record)) return ids;

    for (const file of getVisualMedia(record?.files ?? [])) {
      ids.add(file.id);
    }

    for (const reply of record?.replies ?? []) {
      if (reply.isDraft !== false) continue;

      for (const file of getVisualMedia(reply.files ?? [])) {
        ids.add(file.id);
      }
    }

    return ids;
  }, [record]);

  return {
    isLoading:
      !!recordId &&
      !pendingMedia.some((item) => item.id === mediaId) &&
      (isLoading || !hasCurrentResult),
    media,
    shareableMediaIds,
    teamId: record?.log?.team?.id ?? record?.teamId,
  };
};
