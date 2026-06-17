import { visibleFileQuery } from '@/domain/files/query';
import * as outboxStore from '@/features/offline/outbox-store';
import type * as types from '@/features/offline/types';
import { deleteRecordFile } from '@/features/records/mutations/delete-record-file';
import { deleteReplyFile } from '@/features/records/mutations/delete-reply-file';
import { uploadRecordFile } from '@/features/records/mutations/upload-record-file';
import { uploadReplyFile } from '@/features/records/mutations/upload-reply-file';
import { rejectAfter, wait } from '@/lib/async';
import { db } from '@/lib/db';

const IN_FLIGHT_UPLOAD_RETRY_COUNT = 20;
const IN_FLIGHT_UPLOAD_RETRY_DELAY_MS = 750;
const QUEUED_ATTACHMENT_UPLOAD_TIMEOUT_MS = 2 * 60_000;
// Videos upload in chunks and can be large/slow, so they need a much longer
// budget than the small single-request uploads other file types use.
const QUEUED_VIDEO_UPLOAD_TIMEOUT_MS = 60 * 60_000;
const UPLOADED_FILE_READY_RETRY_COUNT = 20;
const UPLOADED_FILE_READY_RETRY_DELAY_MS = 750;
const PENDING_STREAM_URI_PREFIX = 'stream-pending:';

const isExistingFileIdError = (error: unknown) =>
  error instanceof Error && /file id already exists/i.test(error.message);

const isPendingStreamFile = (file?: { type?: string; uri?: string | null }) =>
  file?.type === 'video' &&
  typeof file.uri === 'string' &&
  file.uri.startsWith(PENDING_STREAM_URI_PREFIX);

const getExistingFile = async (fileId: string) => {
  const result = await db.queryOnce({
    files: {
      $: { ...visibleFileQuery.$, where: { id: fileId } },
      record: { $: { fields: ['id' as const] } },
      reply: { $: { fields: ['id' as const] } },
    },
  });

  return result?.data?.files?.[0];
};

const deleteStalePendingVideo = async (
  attachment: types.QueuedAttachment,
  submission: types.QueuedSubmission
) => {
  if (submission.type === 'record') {
    await deleteRecordFile({
      fileId: attachment.id,
      recordId: submission.contentId,
    });

    return;
  }

  await deleteReplyFile({
    fileId: attachment.id,
    recordId: submission.recordId,
    replyId: submission.contentId,
  });
};

const getUploadedExistingFile = async (
  attachment: types.QueuedAttachment,
  submission: types.QueuedSubmission,
  options: { acceptPendingVideo?: boolean; deletePendingVideo?: boolean } = {
    deletePendingVideo: true,
  }
) => {
  const file = await getExistingFile(attachment.id);
  if (!file?.id) return;

  const linkedToRecord =
    submission.type === 'record'
      ? file.record?.id === submission.contentId
      : file.reply?.id === submission.contentId;

  if (!linkedToRecord) return;

  if (
    attachment.type === 'video' &&
    attachment.status !== 'uploaded' &&
    isPendingStreamFile(file)
  ) {
    if (options.acceptPendingVideo === true) return file;
    if (options.deletePendingVideo === false) return;

    try {
      await deleteStalePendingVideo(attachment, submission);
    } catch {
      // noop
    }

    return;
  }

  return file.assetKey || file.uri ? file : undefined;
};

// Wait long enough to cover the in-flight upload's own timeout. A large video
// streams for many minutes, so giving up after a few seconds just re-uploads it
// from scratch (resetting the progress bar). The loop still exits early as soon
// as the upload finishes or stops.
const getInFlightUploadRetryCount = (attachment: types.QueuedAttachment) =>
  attachment.type === 'video'
    ? Math.ceil(
        QUEUED_VIDEO_UPLOAD_TIMEOUT_MS / IN_FLIGHT_UPLOAD_RETRY_DELAY_MS
      )
    : IN_FLIGHT_UPLOAD_RETRY_COUNT;

const waitForInFlightUpload = async (
  attachment: types.QueuedAttachment,
  submission: types.QueuedSubmission
) => {
  const retryCount = getInFlightUploadRetryCount(attachment);

  for (let attempt = 0; attempt < retryCount; attempt += 1) {
    const current = outboxStore
      .getOutboxSnapshot()
      .attachments.find((item) => item.id === attachment.id);

    if (current?.status === 'uploaded') {
      const file = await getUploadedExistingFile(attachment, submission, {
        acceptPendingVideo: true,
      });

      if (file) {
        outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
        return true;
      }

      outboxStore.setQueuedAttachmentStatus(attachment.id, 'queued');
      return false;
    }

    // The in-flight upload is no longer running (it failed or was reset), so
    // stop waiting and let the caller take over.
    if (current && current.status !== 'uploading') return false;

    // Adopt an already-available file (e.g. uploaded from another device), but
    // never delete the pending video we're actively waiting on — deleting it
    // orphans the finishing upload and forces a full re-upload.
    const file = await getUploadedExistingFile(attachment, submission, {
      deletePendingVideo: false,
    });

    if (file) {
      outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
      return true;
    }

    await wait(IN_FLIGHT_UPLOAD_RETRY_DELAY_MS);
  }

  return false;
};

const waitForUploadedFileReady = async (
  attachment: types.QueuedAttachment,
  submission: types.QueuedSubmission
) => {
  for (let i = 0; i < UPLOADED_FILE_READY_RETRY_COUNT; i += 1) {
    const file = await getUploadedExistingFile(attachment, submission, {
      acceptPendingVideo: true,
    });

    if (file) return file;
    await wait(UPLOADED_FILE_READY_RETRY_DELAY_MS);
  }
};

export const uploadQueuedAttachment = async (
  attachment: types.QueuedAttachment,
  submission: types.QueuedSubmission
) => {
  if (attachment.status === 'uploaded') {
    const file = await getUploadedExistingFile(attachment, submission, {
      acceptPendingVideo: true,
    });

    if (file) {
      outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
      return;
    }

    outboxStore.setQueuedAttachmentStatus(attachment.id, 'queued');
  }

  if (attachment.status === 'uploading') {
    if (await waitForInFlightUpload(attachment, submission)) return;
    outboxStore.setQueuedAttachmentStatus(attachment.id, 'queued');
  }

  const existingFile = await getUploadedExistingFile(attachment, submission);

  if (existingFile) {
    outboxStore.markQueuedAttachmentUploaded(attachment.id, existingFile);
    return;
  }

  const asset = {
    fileName: attachment.name,
    height: attachment.height,
    mimeType: attachment.mimeType,
    size: attachment.size,
    type: attachment.type,
    uri: attachment.localUri,
    width: attachment.width,
  };

  const uploadTimeoutMs =
    attachment.type === 'video'
      ? QUEUED_VIDEO_UPLOAD_TIMEOUT_MS
      : QUEUED_ATTACHMENT_UPLOAD_TIMEOUT_MS;

  const upload = async () => {
    outboxStore.setQueuedAttachmentStatus(attachment.id, 'uploading');

    if (submission.type === 'record') {
      await rejectAfter(
        uploadRecordFile({
          asset: attachment.isRecording ? undefined : asset,
          audioUri: attachment.isRecording ? attachment.localUri : undefined,
          duration: attachment.duration,
          fileId: attachment.id,
          order: attachment.order,
          recordId: submission.contentId,
        }),
        uploadTimeoutMs,
        'Upload timed out'
      );
    } else {
      await rejectAfter(
        uploadReplyFile({
          asset: attachment.isRecording ? undefined : asset,
          audioUri: attachment.isRecording ? attachment.localUri : undefined,
          duration: attachment.duration,
          fileId: attachment.id,
          order: attachment.order,
          recordId: submission.recordId,
          replyId: submission.contentId,
        }),
        uploadTimeoutMs,
        'Upload timed out'
      );
    }
  };

  try {
    await upload();
  } catch (error) {
    const file = await getUploadedExistingFile(attachment, submission);

    if (file) {
      outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
      return;
    }

    if (isExistingFileIdError(error)) {
      await wait(IN_FLIGHT_UPLOAD_RETRY_DELAY_MS);
      await upload();
    } else {
      throw error;
    }
  }

  const file = await waitForUploadedFileReady(attachment, submission);
  if (!file) throw new Error('Uploaded file is not ready yet.');
  outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
};
