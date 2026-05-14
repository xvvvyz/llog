import type { FileItem } from '@/features/files/types/file';
import type { Profile } from '@/features/account/types/profile';
import type { EntryRecord } from '@/features/records/types/entry';
import type * as types from '@/features/offline/types';

const ACTIVE_STATUSES = new Set([
  'pending',
  'syncing',
  'publishing',
  'complete',
  'error',
]);

export const isActiveQueuedSubmission = (submission: types.QueuedSubmission) =>
  ACTIVE_STATUSES.has(submission.status);

export const queuedAttachmentToFileItem = (
  attachment: types.QueuedAttachment
): FileItem =>
  ({
    duration: attachment.duration,
    id: attachment.id,
    mimeType: attachment.mimeType,
    name: attachment.name,
    order: attachment.order,
    size: attachment.size,
    thumbnailUri: attachment.type === 'video' ? attachment.localUri : undefined,
    type: attachment.type,
    uri: attachment.localUri,
  }) as FileItem;

const attachmentsForSubmission = (
  attachments: types.QueuedAttachment[],
  submission: types.QueuedSubmission
) => {
  const uploadedFiles = (submission.files ?? []).map(
    (file) => file as FileItem
  );

  const uploadedFileIds = new Set(uploadedFiles.map((file) => file.id));

  const queuedFiles = attachments
    .filter((attachment) => {
      if (attachment.submissionId) {
        return attachment.submissionId === submission.id;
      }

      if (submission.type === 'record') {
        return (
          attachment.parentType === 'record' &&
          attachment.parentId === submission.contentId
        );
      }

      return (
        attachment.parentType === 'reply' &&
        attachment.parentId === submission.contentId &&
        attachment.recordId === submission.recordId
      );
    })
    .filter((attachment) => !uploadedFileIds.has(attachment.id))
    .map(queuedAttachmentToFileItem);

  return [...uploadedFiles, ...queuedFiles].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
};

const getAuthor = (profile?: Partial<Profile>) =>
  profile?.id ? ({ ...profile, id: profile.id } as Profile) : undefined;

export const queuedRecordToEntry = ({
  attachments,
  profile,
  submission,
}: {
  attachments: types.QueuedAttachment[];
  profile?: Partial<Profile>;
  submission: Extract<types.QueuedSubmission, { type: 'record' }>;
}): EntryRecord => ({
  author: getAuthor(profile),
  date: submission.createdAt,
  files: attachmentsForSubmission(attachments, submission),
  id: submission.contentId,
  isDraft: true,
  isPinned: submission.isPinned,
  links: submission.links,
  log: { id: submission.logId },
  localOutboxStatus: submission.status,
  localStatus: submission.status === 'error' ? 'error' : 'pending',
  reactions: [],
  replies: [],
  tags: submission.tags,
  teamId: submission.teamId,
  text: submission.text,
});

export const queuedReplyToEntry = ({
  attachments,
  profile,
  submission,
}: {
  attachments: types.QueuedAttachment[];
  profile?: Partial<Profile>;
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>;
}): EntryRecord => ({
  author: getAuthor(profile),
  date: submission.createdAt,
  files: attachmentsForSubmission(attachments, submission),
  id: submission.contentId,
  isDraft: true,
  links: submission.links,
  localNeedsDraftReplay: submission.needsDraftReplay,
  localOutboxStatus: submission.status,
  localStatus: submission.status === 'error' ? 'error' : 'pending',
  reactions: [],
  teamId: submission.teamId,
  text: submission.text,
});

const hasFileSource = (file: FileItem) =>
  !!file.assetKey || !!file.thumbnailUri || !!file.uri;

const mergeFiles = (files: FileItem[] = [], pendingFiles: FileItem[] = []) => {
  if (!pendingFiles.length) return files;
  const pendingById = new Map(pendingFiles.map((file) => [file.id, file]));
  const mergedIds = new Set<string>();

  const mergedFiles = files.map((file) => {
    mergedIds.add(file.id);
    const pendingFile = pendingById.get(file.id);
    if (!pendingFile || hasFileSource(file)) return file;
    return { ...file, ...pendingFile } as FileItem;
  });

  for (const pendingFile of pendingFiles) {
    if (!mergedIds.has(pendingFile.id)) mergedFiles.push(pendingFile);
  }

  return mergedFiles.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

const mergePendingEntryFiles = <T extends { files?: FileItem[] }>(
  entry: T,
  pending: EntryRecord
) =>
  ({
    ...entry,
    files: mergeFiles(entry.files, pending.files),
    localOutboxStatus: pending.localOutboxStatus,
    localStatus: pending.localStatus,
  }) as T & Pick<EntryRecord, 'localOutboxStatus' | 'localStatus'>;

const mergePendingEntry = <T extends { files?: FileItem[] }>(
  entry: T,
  pending: EntryRecord
) =>
  ({
    ...entry,
    ...pending,
    files: mergeFiles(entry.files, pending.files),
  }) as T & EntryRecord;

export const mergePendingRecords = <
  T extends { files?: FileItem[]; id: string },
>(
  records: T[],
  pendingRecords: EntryRecord[]
) => {
  const existingIds = new Set(records.map((record) => record.id));

  const pendingById = new Map(
    pendingRecords
      .filter((record): record is EntryRecord & { id: string } => !!record.id)
      .map((record) => [record.id, record])
  );

  const pending = pendingRecords.filter(
    (record): record is EntryRecord & { id: string } =>
      !!record.id && !existingIds.has(record.id)
  );

  return [
    ...pending,
    ...records.map((record) => {
      const pendingRecord = pendingById.get(record.id);

      return pendingRecord
        ? mergePendingEntryFiles(record, pendingRecord)
        : record;
    }),
  ];
};

export const mergePendingReplies = <
  T extends { files?: FileItem[]; id?: string },
>(
  replies: T[],
  pendingReplies: EntryRecord[]
) => {
  const existingIds = new Set(replies.map((reply) => reply.id).filter(Boolean));

  const pendingById = new Map(
    pendingReplies
      .filter((reply): reply is EntryRecord & { id: string } => !!reply.id)
      .map((reply) => [reply.id, reply])
  );

  return [
    ...replies.map((reply) => {
      const pendingReply = reply.id ? pendingById.get(reply.id) : undefined;
      return pendingReply ? mergePendingEntry(reply, pendingReply) : reply;
    }),
    ...pendingReplies.filter(
      (reply) => !!reply.id && !existingIds.has(reply.id)
    ),
  ];
};
