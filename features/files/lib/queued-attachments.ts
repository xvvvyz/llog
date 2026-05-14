import type { FileItem } from '@/features/files/types/file';
import type { QueuedAttachment, QueuedParent } from '@/features/offline/types';

export const isQueuedAttachmentForParent = (
  attachment: QueuedAttachment,
  parent?: QueuedParent
) =>
  !!parent &&
  attachment.parentType === parent.parentType &&
  attachment.parentId === parent.parentId &&
  attachment.recordId === parent.recordId;

export const getQueuedAttachmentsForParent = (
  attachments: QueuedAttachment[],
  parent?: QueuedParent
) =>
  parent
    ? attachments
        .filter(
          (attachment) =>
            !attachment.submissionId &&
            isQueuedAttachmentForParent(attachment, parent)
        )
        .sort((a, b) => a.order - b.order)
    : [];

export const getNextAttachmentOrder = ({
  files,
  queuedAttachments,
}: {
  files?: Pick<FileItem, 'order'>[];
  queuedAttachments?: Pick<QueuedAttachment, 'order'>[];
}) => {
  const maxOrder = [...(files ?? []), ...(queuedAttachments ?? [])].reduce(
    (max, item) => Math.max(max, item.order ?? -1),
    -1
  );

  return maxOrder + 1;
};
