import { visibleFileQuery } from '@/domain/files/query';
import { uploadRecordFile } from '@/features/records/mutations/upload-record-file';
import { uploadReplyFile } from '@/features/records/mutations/upload-reply-file';
import { publishRecord } from '@/features/records/mutations/publish-record';
import { publishReply } from '@/features/records/mutations/publish-reply';
import { createLink } from '@/features/records/mutations/create-link';
import { deleteRecordFile } from '@/features/records/mutations/delete-record-file';
import { deleteReplyFile } from '@/features/records/mutations/delete-reply-file';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { deleteReply } from '@/features/records/mutations/delete-reply';
import { updateReplyDraft } from '@/features/records/mutations/update-reply-draft';
import * as outboxStore from '@/features/offline/outbox-store';
import * as outboxState from '@/features/offline/outbox-state';
import * as queuedLinks from '@/features/offline/queued-links';
import { db } from '@/lib/db';
import type * as types from '@/features/offline/types';

const DRAFT_SYNC_RETRY_COUNT = 20;
const DRAFT_SYNC_RETRY_DELAY_MS = 750;
const IN_FLIGHT_UPLOAD_RETRY_COUNT = 20;
const IN_FLIGHT_UPLOAD_RETRY_DELAY_MS = 750;
const PENDING_STREAM_URI_PREFIX = 'stream-pending:';
let syncPromise: Promise<void> | null = null;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const isCurrentSubmissionSyncable = (submissionId: string) =>
  outboxStore
    .getAutoSyncableSubmissions(outboxStore.getOutboxSnapshot())
    .some((submission) => submission.id === submissionId);

const isAlreadyPublishedError = (error: unknown) =>
  error instanceof Error && /already published/i.test(error.message);

const idsMatchExactly = (
  expected: string[],
  actual: { id?: string }[] = []
) => {
  const actualIds = new Set(actual.map((item) => item.id).filter(Boolean));
  if (actualIds.size !== expected.length) return false;
  return expected.every((id) => actualIds.has(id));
};

const queryRecordDraft = async (
  submission: Extract<types.QueuedSubmission, { type: 'record' }>
) => {
  const { data } = await db.queryOnce({
    records: {
      $: { where: { id: submission.contentId } },
      links: {
        $: {
          fields: [
            'id' as const,
            'label' as const,
            'order' as const,
            'teamId' as const,
            'url' as const,
          ],
        },
      },
      tags: { $: { fields: ['id' as const] } },
    },
  });

  return data.records?.[0];
};

const queryReplyDraft = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) => {
  const { data } = await db.queryOnce({
    replies: {
      $: { where: { id: submission.contentId } },
      links: {
        $: {
          fields: [
            'id' as const,
            'label' as const,
            'order' as const,
            'teamId' as const,
            'url' as const,
          ],
        },
      },
      record: { $: { fields: ['id' as const] } },
    },
  });

  return data.replies?.[0];
};

const draftMatchesSubmission = async (submission: types.QueuedSubmission) => {
  if (submission.type === 'record') {
    const record = await queryRecordDraft(submission);
    if (!record) return false;
    if (!record.isDraft) return true;

    return (
      (submission.isPinned == null ||
        !!record.isPinned === submission.isPinned) &&
      (record.text?.trim() ?? '') === submission.text &&
      outboxState.queuedLinkSnapshotsMatchExactly(
        submission.links,
        record.links
      ) &&
      idsMatchExactly(submission.tagIds, record.tags)
    );
  }

  const reply = await queryReplyDraft(submission);
  if (!reply) return false;
  if (!reply.isDraft) return true;

  return (
    reply.record?.id === submission.recordId &&
    (reply.text?.trim() ?? '') === submission.text &&
    outboxState.queuedLinkSnapshotsMatchExactly(submission.links, reply.links)
  );
};

const waitForDraftState = async (submission: types.QueuedSubmission) => {
  for (let attempt = 0; attempt < DRAFT_SYNC_RETRY_COUNT; attempt += 1) {
    if (await draftMatchesSubmission(submission)) return;
    await wait(DRAFT_SYNC_RETRY_DELAY_MS);
  }

  throw new Error('Draft has not synced yet.');
};

const replayQueuedReplyDraft = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) => {
  if (!submission.authorId || !submission.teamId) return;

  await updateReplyDraft({
    authorId: submission.authorId,
    id: submission.contentId,
    recordId: submission.recordId,
    teamId: submission.teamId,
    text: submission.text,
  });
};

const replayQueuedSubmissionLinks = async (
  submission: types.QueuedSubmission
) => {
  const links = queuedLinks.getReplayableQueuedLinks(submission.links);
  if (!links.length) return;

  for (const link of links) {
    const teamId = link.teamId || submission.teamId;
    if (!teamId) throw new Error('Queued link is missing a team.');

    await createLink({
      label: link.label,
      linkId: link.id,
      order: link.order,
      parentId: submission.contentId,
      parentType: submission.type,
      teamId,
      url: link.url,
    });
  }
};

const queuedReplyNeedsDraftReplay = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) => {
  const reply = await queryReplyDraft(submission);
  return !reply || reply.isDraft !== false;
};

const isReplyForQueuedRecord = (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) =>
  outboxStore
    .getOutboxSnapshot()
    .submissions.some(
      (item) =>
        item.type === 'record' &&
        item.contentId === submission.recordId &&
        item.status !== 'discarded'
    );

const discardedSubmissionContentExists = async (
  submission: types.QueuedSubmission
) => {
  if (submission.type === 'record') {
    const { data } = await db.queryOnce({
      records: {
        $: { fields: ['id' as const], where: { id: submission.contentId } },
      },
    });

    return !!data.records?.[0]?.id;
  }

  const { data } = await db.queryOnce({
    replies: {
      $: { fields: ['id' as const], where: { id: submission.contentId } },
    },
  });

  return !!data.replies?.[0]?.id;
};

const waitForDiscardedSubmissionContent = async (
  submission: types.QueuedSubmission
) => {
  for (let attempt = 0; attempt < DRAFT_SYNC_RETRY_COUNT; attempt += 1) {
    if (await discardedSubmissionContentExists(submission)) return true;
    await wait(DRAFT_SYNC_RETRY_DELAY_MS);
  }

  return false;
};

const cleanupDiscardedSubmission = async (
  submission: types.QueuedSubmission
) => {
  const contentExists = await waitForDiscardedSubmissionContent(submission);

  if (!contentExists) {
    await outboxStore.clearCompletedSubmission(submission.id);
    return;
  }

  if (submission.type === 'record') {
    await deleteRecord({ id: submission.contentId });
  } else {
    await deleteReply({
      id: submission.contentId,
      recordId: submission.recordId,
    });
  }

  await outboxStore.clearCompletedSubmission(submission.id);
};

const getExistingFile = async (fileId: string) => {
  const { data } = await db.queryOnce({
    files: {
      $: { ...visibleFileQuery.$, where: { id: fileId } },
      record: { $: { fields: ['id' as const] } },
      reply: { $: { fields: ['id' as const] } },
    },
  });

  return data.files?.[0];
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
  submission: types.QueuedSubmission
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
    file.uri?.startsWith(PENDING_STREAM_URI_PREFIX)
  ) {
    await deleteStalePendingVideo(attachment, submission);
    return;
  }

  return file.assetKey || file.uri ? file : undefined;
};

const waitForInFlightUpload = async (
  attachment: types.QueuedAttachment,
  submission: types.QueuedSubmission
) => {
  for (let attempt = 0; attempt < IN_FLIGHT_UPLOAD_RETRY_COUNT; attempt += 1) {
    const current = outboxStore
      .getOutboxSnapshot()
      .attachments.find((item) => item.id === attachment.id);

    if (current?.status === 'uploaded') {
      const file = await getUploadedExistingFile(attachment, submission);
      outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
      return true;
    }

    const file = await getUploadedExistingFile(attachment, submission);

    if (file) {
      outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
      return true;
    }

    await wait(IN_FLIGHT_UPLOAD_RETRY_DELAY_MS);
  }

  return false;
};

const uploadQueuedAttachment = async (
  attachment: types.QueuedAttachment,
  submission: types.QueuedSubmission
) => {
  if (attachment.status === 'uploaded') {
    const file = await getUploadedExistingFile(attachment, submission);
    outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
    return;
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

  outboxStore.setQueuedAttachmentStatus(attachment.id, 'uploading');

  const asset = {
    fileName: attachment.name,
    height: attachment.height,
    mimeType: attachment.mimeType,
    size: attachment.size,
    type: attachment.type,
    uri: attachment.localUri,
    width: attachment.width,
  };

  try {
    if (submission.type === 'record') {
      await uploadRecordFile({
        asset: attachment.isRecording ? undefined : asset,
        audioUri: attachment.isRecording ? attachment.localUri : undefined,
        duration: attachment.duration,
        fileId: attachment.id,
        order: attachment.order,
        recordId: submission.contentId,
      });
    } else {
      await uploadReplyFile({
        asset: attachment.isRecording ? undefined : asset,
        audioUri: attachment.isRecording ? attachment.localUri : undefined,
        duration: attachment.duration,
        fileId: attachment.id,
        order: attachment.order,
        recordId: submission.recordId,
        replyId: submission.contentId,
      });
    }
  } catch (error) {
    const file = await getUploadedExistingFile(attachment, submission);

    if (file) {
      outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
      return;
    }

    throw error;
  }

  const file = await getUploadedExistingFile(attachment, submission);
  outboxStore.markQueuedAttachmentUploaded(attachment.id, file);
};

const publishQueuedSubmission = async (submission: types.QueuedSubmission) => {
  outboxStore.setQueuedSubmissionStatus(submission.id, 'publishing');

  try {
    if (submission.type === 'record') {
      await publishRecord({ id: submission.contentId });
    } else {
      await publishReply({
        id: submission.contentId,
        recordId: submission.recordId,
        text: submission.text,
      });
    }
  } catch (error) {
    if (!isAlreadyPublishedError(error)) throw error;
  }

  outboxStore.setQueuedSubmissionStatus(submission.id, 'complete');
};

export const syncQueuedSubmission = async (
  submission: types.QueuedSubmission
) => {
  const currentSubmission = submission;
  outboxStore.setQueuedSubmissionStatus(currentSubmission.id, 'syncing');
  if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;

  if (currentSubmission.type === 'reply') {
    if (isReplyForQueuedRecord(currentSubmission)) {
      await outboxStore.discardQueuedSubmission(currentSubmission.id);
      return;
    }

    if (
      currentSubmission.needsDraftReplay === true &&
      (await queuedReplyNeedsDraftReplay(currentSubmission))
    ) {
      await replayQueuedReplyDraft(currentSubmission);
    }
  }

  await replayQueuedSubmissionLinks(currentSubmission);
  if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
  await waitForDraftState(currentSubmission);
  if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;

  const attachments = outboxStore.getQueuedAttachmentsForSubmission(
    outboxStore.getOutboxSnapshot(),
    currentSubmission
  );

  for (const attachment of attachments) {
    if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
    await uploadQueuedAttachment(attachment, currentSubmission);
  }

  if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
  await publishQueuedSubmission(currentSubmission);
};

export const syncOutboxOnce = async () => {
  await outboxStore.ensureOutboxHydrated();

  const syncable = outboxStore.getAutoSyncableSubmissions(
    outboxStore.getOutboxSnapshot()
  );

  for (const submission of syncable) {
    try {
      await syncQueuedSubmission(submission);
    } catch (error) {
      const currentSubmission = outboxStore
        .getOutboxSnapshot()
        .submissions.find((item) => item.id === submission.id);

      if (currentSubmission) {
        for (const attachment of outboxStore.getQueuedAttachmentsForSubmission(
          outboxStore.getOutboxSnapshot(),
          currentSubmission
        )) {
          if (attachment.status === 'uploading') {
            outboxStore.setQueuedAttachmentStatus(
              attachment.id,
              'error',
              getErrorMessage(error, 'Upload failed')
            );
          }
        }
      }

      outboxStore.setQueuedSubmissionStatus(
        submission.id,
        'error',
        getErrorMessage(error, 'Sync failed')
      );
    }
  }

  const discarded = outboxStore.getDiscardedSubmissions(
    outboxStore.getOutboxSnapshot()
  );

  for (const submission of discarded) {
    try {
      await cleanupDiscardedSubmission(submission);
    } catch (error) {
      console.error('Failed to clean up discarded offline submission', error);
    }
  }
};

export const runOutboxSync = () => {
  if (syncPromise) return syncPromise;

  const run = async () => {
    try {
      await syncOutboxOnce();
    } finally {
      syncPromise = null;
    }
  };

  syncPromise = run();
  return syncPromise;
};
