import { visibleFileQuery } from '@/domain/files/query';
import { uploadRecordFile } from '@/features/records/mutations/upload-record-file';
import { uploadReplyFile } from '@/features/records/mutations/upload-reply-file';
import { publishRecord } from '@/features/records/mutations/publish-record';
import { publishReply } from '@/features/records/mutations/publish-reply';
import { createLink } from '@/features/records/mutations/create-link';
import { deleteLink } from '@/features/records/mutations/delete-link';
import { deleteRecordFile } from '@/features/records/mutations/delete-record-file';
import { deleteReplyFile } from '@/features/records/mutations/delete-reply-file';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { deleteReply } from '@/features/records/mutations/delete-reply';
import { replayRecordDraft } from '@/features/records/mutations/replay-record-draft';
import { replayReplyDraft } from '@/features/records/mutations/replay-reply-draft';
import { applyRecordPin } from '@/features/records/mutations/toggle-pin';
import { fetchOutboxNetworkReachability } from '@/features/offline/outbox-network';
import * as outboxStore from '@/features/offline/outbox-store';
import * as outboxState from '@/features/offline/outbox-state';
import { alert as showAlert } from '@/lib/alert';
import { db } from '@/lib/db';
import { rejectAfter, wait } from '@/lib/async';
import type * as types from '@/features/offline/types';

const DRAFT_SYNC_RETRY_COUNT = 20;
const DRAFT_SYNC_RETRY_DELAY_MS = 750;
const IN_FLIGHT_UPLOAD_RETRY_COUNT = 20;
const IN_FLIGHT_UPLOAD_RETRY_DELAY_MS = 750;
const QUEUED_ATTACHMENT_UPLOAD_TIMEOUT_MS = 2 * 60_000;
const QUEUED_SUBMISSION_PUBLISH_TIMEOUT_MS = 45_000;
const UPLOADED_FILE_READY_RETRY_COUNT = 20;
const UPLOADED_FILE_READY_RETRY_DELAY_MS = 750;
const PENDING_STREAM_URI_PREFIX = 'stream-pending:';
let syncPromise: Promise<void> | null = null;
let shouldRunAfterCurrentSync = false;
const alertedSyncErrors = new Set<string>();

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const canStartOutboxNetworkRequests = async () =>
  (await fetchOutboxNetworkReachability()) !== false;

const isOutboxNetworkReachable = async () =>
  (await fetchOutboxNetworkReachability()) === true;

const isOutboxNetworkOffline = async () =>
  (await fetchOutboxNetworkReachability()) === false;

const hasRunnableOutboxWork = () => {
  const snapshot = outboxStore.getOutboxSnapshot();

  return (
    outboxStore.getStartableAutoSyncSubmissions(snapshot).length > 0 ||
    outboxStore.getDiscardedSubmissions(snapshot).length > 0 ||
    outboxStore.getQueuedRecordPins(snapshot).length > 0
  );
};

const isCurrentSubmissionSyncable = (submissionId: string) =>
  outboxStore
    .getAutoSyncableSubmissions(outboxStore.getOutboxSnapshot())
    .some((submission) => submission.id === submissionId);

const isAlreadyPublishedError = (error: unknown) =>
  error instanceof Error && /already published/i.test(error.message);

const isReplyNotFoundError = (error: unknown) =>
  error instanceof Error && /reply not found/i.test(error.message);

const isExistingFileIdError = (error: unknown) =>
  error instanceof Error && /file id already exists/i.test(error.message);

const isPendingStreamFile = (file?: { type?: string; uri?: string | null }) =>
  file?.type === 'video' &&
  typeof file.uri === 'string' &&
  file.uri.startsWith(PENDING_STREAM_URI_PREFIX);

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
  const result = await db.queryOnce({
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

  return result?.data?.records?.[0];
};

const queryReplyDraft = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) => {
  const result = await db.queryOnce({
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

  return result?.data?.replies?.[0];
};

const queryRecordSyncTarget = async (recordId: string) => {
  const result = await db.queryOnce({
    records: {
      $: {
        fields: ['id' as const, 'teamId' as const],
        where: { id: recordId },
      },
    },
  });

  const record = result?.data?.records?.[0];
  return { exists: !!record?.id, teamId: record?.teamId };
};

const queryRecordTeamId = async (recordId: string) =>
  (await queryRecordSyncTarget(recordId)).teamId;

const queryLogTeamId = async (logId: string) => {
  const result = await db.queryOnce({
    logs: {
      $: { fields: ['id' as const, 'teamId' as const], where: { id: logId } },
    },
  });

  return result?.data?.logs?.[0]?.teamId;
};

const queryCurrentProfileId = async () => {
  const auth = await db.getAuth();
  if (!auth?.id) return;

  const result = await db.queryOnce({
    profiles: { $: { fields: ['id' as const], where: { user: auth.id } } },
  });

  return result?.data?.profiles?.[0]?.id;
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
): Promise<Extract<types.QueuedSubmission, { type: 'reply' }>> => {
  const authorId = submission.authorId ?? (await queryCurrentProfileId());

  if (authorId && authorId !== submission.authorId) {
    outboxStore.updateQueuedSubmission(submission.id, (current) =>
      current.type === 'reply' ? { authorId } : {}
    );
  }

  if (!authorId) throw new Error('Queued reply is missing replay identity.');

  const teamId =
    submission.teamId ?? (await queryRecordTeamId(submission.recordId));

  if (teamId && teamId !== submission.teamId) {
    outboxStore.updateQueuedSubmission(submission.id, (current) =>
      current.type === 'reply' ? { teamId } : {}
    );
  }

  if (!teamId) throw new Error('Queued reply is missing replay identity.');

  await replayReplyDraft({
    authorId,
    date: submission.createdAt,
    id: submission.contentId,
    recordId: submission.recordId,
    teamId,
    text: submission.text,
  });

  return teamId === submission.teamId && authorId === submission.authorId
    ? submission
    : { ...submission, authorId, teamId };
};

const replayQueuedRecordDraft = async (
  submission: Extract<types.QueuedSubmission, { type: 'record' }>
): Promise<Extract<types.QueuedSubmission, { type: 'record' }>> => {
  const authorId = submission.authorId ?? (await queryCurrentProfileId());

  const teamId =
    submission.teamId ??
    (submission.logId ? await queryLogTeamId(submission.logId) : undefined);

  if (authorId && authorId !== submission.authorId) {
    outboxStore.updateQueuedSubmission(submission.id, (current) =>
      current.type === 'record' ? { authorId } : {}
    );
  }

  if (teamId && teamId !== submission.teamId) {
    outboxStore.updateQueuedSubmission(submission.id, (current) =>
      current.type === 'record' ? { teamId } : {}
    );
  }

  if (!authorId || !submission.logId || !teamId) {
    throw new Error('Queued record is missing replay identity.');
  }

  await replayRecordDraft({
    authorId,
    date: submission.createdAt,
    id: submission.contentId,
    isPinned: submission.isPinned,
    logId: submission.logId,
    tagIds: submission.tagIds,
    teamId,
    text: submission.text,
  });

  return teamId === submission.teamId && authorId === submission.authorId
    ? submission
    : { ...submission, authorId, teamId };
};

const discardOrphanedReplySubmission = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) => {
  await outboxStore.discardQueuedSubmission(submission.id);
  await outboxStore.clearCompletedSubmission(submission.id);
};

const resolveQueuedReplyParent = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
): Promise<
  | { status: 'missing' }
  | {
      status: 'exists';
      submission: Extract<types.QueuedSubmission, { type: 'reply' }>;
    }
> => {
  const target = await queryRecordSyncTarget(submission.recordId);
  if (!target.exists) return { status: 'missing' };

  if (target.teamId && target.teamId !== submission.teamId) {
    outboxStore.updateQueuedSubmission(submission.id, (current) =>
      current.type === 'reply' ? { teamId: target.teamId } : {}
    );

    return {
      status: 'exists',
      submission: { ...submission, teamId: target.teamId },
    };
  }

  return { status: 'exists', submission };
};

const alertSyncFailure = (
  submission: types.QueuedSubmission,
  message: string
) => {
  const key = `${submission.id}:${message}`;
  if (alertedSyncErrors.has(key)) return;
  alertedSyncErrors.add(key);
  showAlert({ title: 'Queued item failed', message });
};

const replayQueuedSubmissionLinks = async (
  submission: types.QueuedSubmission
) => {
  const content =
    submission.type === 'record'
      ? await queryRecordDraft(submission)
      : await queryReplyDraft(submission);

  const expectedLinkIds = new Set(submission.links.map((link) => link.id));

  const staleLinkIds =
    content?.links
      ?.map((link) => link.id)
      .filter(
        (linkId): linkId is string => !!linkId && !expectedLinkIds.has(linkId)
      ) ?? [];

  for (const link of submission.links) {
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

  for (const linkId of staleLinkIds) {
    await deleteLink({ id: linkId });
  }
};

const queuedReplyNeedsDraftReplay = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) => {
  const reply = await queryReplyDraft(submission);
  return !reply || reply.isDraft !== false;
};

const queuedSubmissionIsPublished = async (
  submission: types.QueuedSubmission
) => {
  const content =
    submission.type === 'record'
      ? await queryRecordDraft(submission)
      : await queryReplyDraft(submission);

  return content?.isDraft === false;
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
    const result = await db.queryOnce({
      records: {
        $: { fields: ['id' as const], where: { id: submission.contentId } },
      },
    });

    return !!result?.data?.records?.[0]?.id;
  }

  const result = await db.queryOnce({
    replies: {
      $: { fields: ['id' as const], where: { id: submission.contentId } },
    },
  });

  return !!result?.data?.replies?.[0]?.id;
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

const waitForInFlightUpload = async (
  attachment: types.QueuedAttachment,
  submission: types.QueuedSubmission
) => {
  for (let attempt = 0; attempt < IN_FLIGHT_UPLOAD_RETRY_COUNT; attempt += 1) {
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

    const file = await getUploadedExistingFile(attachment, submission);

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

const uploadQueuedAttachment = async (
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
        QUEUED_ATTACHMENT_UPLOAD_TIMEOUT_MS,
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
        QUEUED_ATTACHMENT_UPLOAD_TIMEOUT_MS,
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

const publishQueuedSubmission = async (submission: types.QueuedSubmission) => {
  outboxStore.setQueuedSubmissionStatus(submission.id, 'publishing');

  try {
    if (submission.type === 'record') {
      await rejectAfter(
        publishRecord({ id: submission.contentId }),
        QUEUED_SUBMISSION_PUBLISH_TIMEOUT_MS,
        'Publish timed out'
      );
    } else {
      await rejectAfter(
        publishReply({
          id: submission.contentId,
          recordId: submission.recordId,
          text: submission.text,
        }),
        QUEUED_SUBMISSION_PUBLISH_TIMEOUT_MS,
        'Publish timed out'
      );
    }
  } catch (error) {
    if (!isAlreadyPublishedError(error)) throw error;
  }

  outboxStore.setQueuedSubmissionStatus(submission.id, 'complete');
};

const canPublishQueuedReplyDirectly = (
  submission: types.QueuedSubmission,
  attachments: types.QueuedAttachment[]
) =>
  submission.type === 'reply' &&
  submission.text.trim().length > 0 &&
  submission.files.length === 0 &&
  submission.links.length === 0 &&
  attachments.length === 0;

export const syncQueuedSubmission = async (
  submission: types.QueuedSubmission
) => {
  let currentSubmission = submission;

  const pendingAttachments = outboxStore.getQueuedAttachmentsForSubmission(
    outboxStore.getOutboxSnapshot(),
    currentSubmission
  );

  if (
    pendingAttachments.some((attachment) => attachment.status === 'persisting')
  ) {
    return;
  }

  outboxStore.setQueuedSubmissionStatus(currentSubmission.id, 'syncing');
  if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;

  if (currentSubmission.type === 'reply') {
    const parent = await resolveQueuedReplyParent(currentSubmission);

    if (parent.status === 'missing') {
      await discardOrphanedReplySubmission(currentSubmission);
      return;
    }

    currentSubmission = parent.submission;
  }

  if (canPublishQueuedReplyDirectly(currentSubmission, pendingAttachments)) {
    await publishQueuedSubmission(currentSubmission);
    return;
  }

  const isAlreadyPublished =
    await queuedSubmissionIsPublished(currentSubmission);

  if (!isAlreadyPublished) {
    if (currentSubmission.type === 'record') {
      currentSubmission = await replayQueuedRecordDraft(currentSubmission);
    } else {
      if (isReplyForQueuedRecord(currentSubmission)) {
        await outboxStore.discardQueuedSubmission(currentSubmission.id);
        return;
      }

      if (
        currentSubmission.needsDraftReplay === true &&
        (await queuedReplyNeedsDraftReplay(currentSubmission))
      ) {
        currentSubmission = await replayQueuedReplyDraft(currentSubmission);
      }
    }

    await replayQueuedSubmissionLinks(currentSubmission);
    if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
    await waitForDraftState(currentSubmission);
    if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
  }

  const attachments = outboxStore.getQueuedAttachmentsForSubmission(
    outboxStore.getOutboxSnapshot(),
    currentSubmission
  );

  if (attachments.some((attachment) => attachment.status === 'persisting')) {
    outboxStore.setQueuedSubmissionStatus(currentSubmission.id, 'pending');
    return;
  }

  for (const attachment of attachments) {
    if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
    await uploadQueuedAttachment(attachment, currentSubmission);
  }

  if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;

  if (isAlreadyPublished) {
    outboxStore.setQueuedSubmissionStatus(currentSubmission.id, 'complete');
  } else {
    await publishQueuedSubmission(currentSubmission);
  }
};

export const syncOutboxOnce = async () => {
  await outboxStore.ensureOutboxHydrated();
  if (!(await canStartOutboxNetworkRequests())) return;

  const syncable = outboxStore.getStartableAutoSyncSubmissions(
    outboxStore.getOutboxSnapshot()
  );

  for (const submission of syncable) {
    if (!(await canStartOutboxNetworkRequests())) return;

    try {
      await syncQueuedSubmission(submission);
    } catch (error) {
      const isNetworkOffline = await isOutboxNetworkOffline();

      const currentSubmission = outboxStore
        .getOutboxSnapshot()
        .submissions.find((item) => item.id === submission.id);

      const attachments = currentSubmission
        ? outboxStore.getQueuedAttachmentsForSubmission(
            outboxStore.getOutboxSnapshot(),
            currentSubmission
          )
        : [];

      if (currentSubmission) {
        for (const attachment of attachments) {
          if (attachment.status === 'uploading') {
            outboxStore.setQueuedAttachmentStatus(
              attachment.id,
              isNetworkOffline ? 'queued' : 'error',
              getErrorMessage(error, 'Upload failed')
            );
          }
        }
      }

      if (
        currentSubmission?.type === 'reply' &&
        isReplyNotFoundError(error) &&
        !(await queryRecordSyncTarget(currentSubmission.recordId)).exists
      ) {
        await discardOrphanedReplySubmission(currentSubmission);
        continue;
      }

      if (isNetworkOffline) {
        outboxStore.setQueuedSubmissionStatus(submission.id, 'pending');
        continue;
      }

      const message = getErrorMessage(error, 'Sync failed');
      outboxStore.setQueuedSubmissionStatus(submission.id, 'error', message);
      alertSyncFailure(submission, message);
    }
  }

  const discarded = outboxStore.getDiscardedSubmissions(
    outboxStore.getOutboxSnapshot()
  );

  for (const submission of discarded) {
    if (!(await canStartOutboxNetworkRequests())) return;

    try {
      await cleanupDiscardedSubmission(submission);
    } catch {
      // noop
    }
  }

  const queuedRecordPins = outboxStore.getQueuedRecordPins(
    outboxStore.getOutboxSnapshot()
  );

  for (const recordPin of queuedRecordPins) {
    if (!(await isOutboxNetworkReachable())) return;

    try {
      if (!(await queryRecordSyncTarget(recordPin.recordId)).exists) {
        outboxStore.clearQueuedRecordPin({ recordId: recordPin.recordId });
        continue;
      }

      await applyRecordPin({
        id: recordPin.recordId,
        isPinned: recordPin.isPinned,
      });

      outboxStore.clearQueuedRecordPin({
        isPinned: recordPin.isPinned,
        recordId: recordPin.recordId,
      });
    } catch (error) {
      if (!(await isOutboxNetworkReachable())) return;
      console.error('Failed to sync queued record pin', error);
    }
  }
};

export const runOutboxSync = () => {
  if (syncPromise) {
    shouldRunAfterCurrentSync = true;
    return syncPromise;
  }

  const run = async () => {
    try {
      await syncOutboxOnce();
    } finally {
      syncPromise = null;

      if (shouldRunAfterCurrentSync) {
        shouldRunAfterCurrentSync = false;
        if (hasRunnableOutboxWork()) void runOutboxSync();
      }
    }
  };

  syncPromise = run();
  return syncPromise;
};
