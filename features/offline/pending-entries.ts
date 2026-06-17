import type { FileItem } from '@/instant.entities';
import type { Profile } from '@/features/account/types/profile';
import * as visualMedia from '@/features/files/lib/visual-media';
import type { EntryRecord } from '@/features/records/types/entry';
import * as recordTime from '@/features/records/lib/record-time';
import type * as types from '@/features/offline/types';

const ACTIVE_STATUSES = new Set([
  'pending',
  'syncing',
  'publishing',
  'processing',
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
  const queuedAttachments = attachments.filter((attachment) => {
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
  });

  const localUriById = new Map(
    queuedAttachments
      .filter((attachment) => attachment.localUri)
      .map((attachment) => [attachment.id, attachment.localUri as string])
  );

  const uploadedFiles = (submission.files ?? []).map((file) => {
    const uploadedFile = file as FileItem;
    const localUri = localUriById.get(uploadedFile.id);

    // A just-uploaded video is still encoding; its server uri is a non-playable
    // stream-pending placeholder, so keep the local source to preview from.
    return uploadedFile.type === 'video' &&
      localUri &&
      !visualMedia.isLocalPreviewableUri(uploadedFile.uri)
      ? ({ ...uploadedFile, uri: localUri } as FileItem)
      : uploadedFile;
  });

  const uploadedFileIds = new Set(uploadedFiles.map((file) => file.id));

  const queuedFiles = queuedAttachments
    .filter((attachment) => !uploadedFileIds.has(attachment.id))
    .map(queuedAttachmentToFileItem);

  return [...uploadedFiles, ...queuedFiles].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
};

const syncErrorForSubmission = (
  attachments: types.QueuedAttachment[],
  submission: types.QueuedSubmission
) =>
  submission.error ??
  attachments.find(
    (attachment) =>
      attachment.status === 'error' &&
      (attachment.submissionId === submission.id ||
        (submission.type === 'record'
          ? attachment.parentType === 'record' &&
            attachment.parentId === submission.contentId
          : attachment.parentType === 'reply' &&
            attachment.parentId === submission.contentId &&
            attachment.recordId === submission.recordId))
  )?.error;

const getAuthor = (profile?: Partial<Profile>) =>
  profile?.id ? ({ ...profile, id: profile.id } as Profile) : undefined;

const getQueuedRecordStatus = (
  submission: Extract<types.QueuedSubmission, { type: 'record' }>
) =>
  recordTime.isFutureRecordDate(submission.recordDate) ? 'scheduled' : 'draft';

const getLocalStatusFields = (submission: types.QueuedSubmission) =>
  submission.status === 'complete'
    ? {}
    : ({
        localStatus: submission.status === 'error' ? 'error' : 'pending',
      } as const);

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
  date: recordTime.getRecordDate(submission),
  files: attachmentsForSubmission(attachments, submission),
  id: submission.contentId,
  isPinned: submission.isPinned,
  links: submission.links,
  log: { id: submission.logId },
  localOutboxStatus: submission.status,
  ...getLocalStatusFields(submission),
  reactions: [],
  replies: [],
  syncError: syncErrorForSubmission(attachments, submission),
  status: getQueuedRecordStatus(submission),
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
  ...getLocalStatusFields(submission),
  reactions: [],
  syncError: syncErrorForSubmission(attachments, submission),
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
    if (!pendingFile) return file;

    // Prefer the local source while a video's server uri is still a
    // non-playable stream-pending placeholder, so its poster keeps showing.
    if (
      file.type === 'video' &&
      !visualMedia.isLocalPreviewableUri(file.uri) &&
      visualMedia.isLocalPreviewableUri(pendingFile.uri)
    ) {
      return { ...file, uri: pendingFile.uri } as FileItem;
    }

    if (hasFileSource(file)) return file;
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
    syncError: pending.syncError,
  }) as T &
    Pick<EntryRecord, 'localOutboxStatus' | 'localStatus' | 'syncError'>;

const mergePendingEntry = <T extends { files?: FileItem[] }>(
  entry: T,
  pending: EntryRecord
) =>
  ({
    ...entry,
    ...pending,
    files: mergeFiles(entry.files, pending.files),
  }) as T & EntryRecord;

const getEntryDateTime = (entry: { date?: Date | string | number | null }) => {
  if (!entry.date) return Number.NEGATIVE_INFINITY;
  const time = new Date(entry.date).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
};

const sortRepliesByDateAsc = <
  T extends { date?: Date | string | number | null; id?: string },
>(
  replies: T[]
) =>
  replies
    .map((reply, index) => ({ index, reply }))
    .sort((a, b) => {
      const aTime = getEntryDateTime(a.reply);
      const bTime = getEntryDateTime(b.reply);
      if (aTime !== bTime) return aTime - bTime;
      const idComparison = (a.reply.id ?? '').localeCompare(b.reply.id ?? '');
      if (idComparison !== 0) return idComparison;
      return a.index - b.index;
    })
    .map(({ reply }) => reply);

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
  T extends {
    date?: Date | string | number | null;
    files?: FileItem[];
    id?: string;
  },
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

  return sortRepliesByDateAsc([
    ...replies.map((reply) => {
      const pendingReply = reply.id ? pendingById.get(reply.id) : undefined;
      return pendingReply ? mergePendingEntry(reply, pendingReply) : reply;
    }),
    ...pendingReplies.filter(
      (reply) => !!reply.id && !existingIds.has(reply.id)
    ),
  ]);
};
