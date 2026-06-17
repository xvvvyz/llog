import type * as types from '@/features/offline/types';

const QUEUED_SUBMISSION_PUBLISH_TIMEOUT_MS = 45_000;
const QUEUED_SUBMISSION_REFRESH_LIMIT = 5;

export type OutboxSyncSnapshot = types.PersistedOutbox & { hydrated: boolean };

export type OutboxSyncStore = {
  clearQueuedRecordPin: (input: {
    isPinned?: boolean;
    recordId: string;
  }) => void;
  discardQueuedSubmission: (submissionId: string) => Promise<void>;
  ensureOutboxHydrated: () => Promise<void>;
  getAutoSyncableSubmissions: (
    state: OutboxSyncSnapshot
  ) => types.QueuedSubmission[];
  getDiscardedSubmissions: (
    state: OutboxSyncSnapshot
  ) => types.QueuedSubmission[];
  getOutboxSnapshot: () => OutboxSyncSnapshot;
  getQueuedAttachmentsForSubmission: (
    state: OutboxSyncSnapshot,
    submission: types.QueuedSubmission
  ) => types.QueuedAttachment[];
  getQueuedRecordPins: (state: OutboxSyncSnapshot) => types.QueuedRecordPin[];
  getStartableAutoSyncSubmissions: (
    state: OutboxSyncSnapshot
  ) => types.QueuedSubmission[];
  setQueuedAttachmentStatus: (
    fileId: string,
    status: types.QueuedAttachmentStatus,
    error?: string
  ) => void;
  setQueuedSubmissionStatus: (
    submissionId: string,
    status: types.OutboxStatus,
    error?: string
  ) => void;
};

type RecordSubmission = Extract<types.QueuedSubmission, { type: 'record' }>;
type ReplySubmission = Extract<types.QueuedSubmission, { type: 'reply' }>;

export type OutboxSyncDependencies = {
  applyRecordPin: (input: {
    id: string;
    isPinned: boolean;
  }) => Promise<unknown>;
  cleanupDiscardedSubmission: (
    submission: types.QueuedSubmission
  ) => Promise<void>;
  discardOrphanedReplySubmission: (
    submission: ReplySubmission
  ) => Promise<void>;
  fetchOutboxNetworkReachability: () => Promise<boolean | undefined>;
  isReplyForQueuedRecord: (submission: ReplySubmission) => boolean;
  logError: (...args: unknown[]) => void;
  mediaProcessed: (fileIds: string[]) => Promise<boolean>;
  outboxStore: OutboxSyncStore;
  publishRecord: (input: { id: string }) => Promise<unknown>;
  publishReply: (input: {
    id: string;
    recordId: string;
    text: string;
  }) => Promise<unknown>;
  queryRecordSyncTarget: (
    recordId: string
  ) => Promise<{ exists: boolean; teamId?: string }>;
  queuedReplyNeedsDraftReplay: (
    submission: ReplySubmission
  ) => Promise<boolean>;
  queuedSubmissionIsPublished: (
    submission: types.QueuedSubmission
  ) => Promise<boolean>;
  rejectAfter: <T>(
    promise: Promise<T>,
    timeoutMs: number,
    message: string
  ) => Promise<T>;
  replayQueuedRecordDraft: (
    submission: RecordSubmission
  ) => Promise<RecordSubmission>;
  replayQueuedReplyDraft: (
    submission: ReplySubmission
  ) => Promise<ReplySubmission>;
  replayQueuedSubmissionLinks: (
    submission: types.QueuedSubmission
  ) => Promise<void>;
  resolveQueuedReplyParent: (
    submission: ReplySubmission
  ) => Promise<
    { status: 'missing' } | { status: 'exists'; submission: ReplySubmission }
  >;
  uploadQueuedAttachment: (
    attachment: types.QueuedAttachment,
    submission: types.QueuedSubmission
  ) => Promise<void>;
  waitForDraftState: (submission: types.QueuedSubmission) => Promise<void>;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const isAlreadyPublishedError = (error: unknown) =>
  error instanceof Error && /already published/i.test(error.message);

const isReplyNotFoundError = (error: unknown) =>
  error instanceof Error && /reply not found/i.test(error.message);

const canPublishQueuedReplyDirectly = (
  submission: types.QueuedSubmission,
  attachments: types.QueuedAttachment[]
) =>
  submission.type === 'reply' &&
  submission.text.trim().length > 0 &&
  submission.files.length === 0 &&
  submission.links.length === 0 &&
  attachments.length === 0;

const linkSyncKey = (link: types.QueuedLinkSnapshot) =>
  [link.id, link.label, link.order, link.teamId ?? '', link.url].join('\u0000');

const submissionDraftSyncKey = (submission: types.QueuedSubmission) =>
  submission.type === 'record'
    ? [
        submission.type,
        submission.contentId,
        submission.isPinned == null ? '' : String(submission.isPinned),
        submission.recordDate ?? '',
        submission.text,
        submission.tagIds.join('\u0000'),
        submission.links.map(linkSyncKey).join('\u0001'),
      ].join('\u0002')
    : [
        submission.type,
        submission.contentId,
        submission.recordId,
        submission.text,
        submission.links.map(linkSyncKey).join('\u0001'),
      ].join('\u0002');

export const createOutboxSyncRunner = (deps: OutboxSyncDependencies) => {
  let syncPromise: Promise<void> | null = null;
  let shouldRunAfterCurrentSync = false;

  const canStartOutboxNetworkRequests = async () =>
    (await deps.fetchOutboxNetworkReachability()) !== false;

  const isOutboxNetworkReachable = async () =>
    (await deps.fetchOutboxNetworkReachability()) === true;

  const isOutboxNetworkOffline = async () =>
    (await deps.fetchOutboxNetworkReachability()) === false;

  const hasRunnableOutboxWork = () => {
    const snapshot = deps.outboxStore.getOutboxSnapshot();

    return (
      deps.outboxStore.getStartableAutoSyncSubmissions(snapshot).length > 0 ||
      deps.outboxStore.getDiscardedSubmissions(snapshot).length > 0 ||
      deps.outboxStore.getQueuedRecordPins(snapshot).length > 0
    );
  };

  const getCurrentSyncableSubmission = (submissionId: string) =>
    deps.outboxStore
      .getAutoSyncableSubmissions(deps.outboxStore.getOutboxSnapshot())
      .find((submission) => submission.id === submissionId);

  const isCurrentSubmissionSyncable = (submissionId: string) =>
    !!getCurrentSyncableSubmission(submissionId);

  const getSubmissionVideoFileIds = (submission: types.QueuedSubmission) =>
    deps.outboxStore
      .getQueuedAttachmentsForSubmission(
        deps.outboxStore.getOutboxSnapshot(),
        submission
      )
      .filter((attachment) => attachment.type === 'video')
      .map((attachment) => attachment.id);

  const replayQueuedSubmissionDraftState = async (
    submission: types.QueuedSubmission
  ) => {
    let currentSubmission = submission;

    if (currentSubmission.type === 'record') {
      currentSubmission = await deps.replayQueuedRecordDraft(currentSubmission);
    } else {
      if (deps.isReplyForQueuedRecord(currentSubmission)) {
        await deps.outboxStore.discardQueuedSubmission(currentSubmission.id);
        return;
      }

      if (
        currentSubmission.needsDraftReplay === true &&
        (await deps.queuedReplyNeedsDraftReplay(currentSubmission))
      ) {
        currentSubmission =
          await deps.replayQueuedReplyDraft(currentSubmission);
      }
    }

    await deps.replayQueuedSubmissionLinks(currentSubmission);
    if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
    await deps.waitForDraftState(currentSubmission);
    if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
    return currentSubmission;
  };

  const syncQueuedSubmissionAttachments = async (
    submission: types.QueuedSubmission
  ) => {
    const attachments = deps.outboxStore.getQueuedAttachmentsForSubmission(
      deps.outboxStore.getOutboxSnapshot(),
      submission
    );

    if (attachments.some((attachment) => attachment.status === 'persisting')) {
      deps.outboxStore.setQueuedSubmissionStatus(submission.id, 'pending');
      return { status: 'pending' as const };
    }

    const attemptedAttachmentIds = new Set<string>();

    for (const attachment of attachments) {
      const latestSubmission = getCurrentSyncableSubmission(submission.id);
      if (!latestSubmission) return { status: 'stopped' as const };

      const latestAttachment = deps.outboxStore
        .getQueuedAttachmentsForSubmission(
          deps.outboxStore.getOutboxSnapshot(),
          latestSubmission
        )
        .find((item) => item.id === attachment.id);

      if (!latestAttachment) continue;
      attemptedAttachmentIds.add(latestAttachment.id);
      await deps.uploadQueuedAttachment(latestAttachment, latestSubmission);
    }

    return { attemptedAttachmentIds, status: 'synced' as const };
  };

  const publishQueuedSubmission = async (
    submission: types.QueuedSubmission
  ) => {
    deps.outboxStore.setQueuedSubmissionStatus(submission.id, 'publishing');

    try {
      if (submission.type === 'record') {
        await deps.rejectAfter(
          deps.publishRecord({ id: submission.contentId }),
          QUEUED_SUBMISSION_PUBLISH_TIMEOUT_MS,
          'Publish timed out'
        );
      } else {
        await deps.rejectAfter(
          deps.publishReply({
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

    deps.outboxStore.setQueuedSubmissionStatus(submission.id, 'complete');
  };

  const syncQueuedSubmission = async (submission: types.QueuedSubmission) => {
    let currentSubmission = submission;

    const pendingAttachments =
      deps.outboxStore.getQueuedAttachmentsForSubmission(
        deps.outboxStore.getOutboxSnapshot(),
        currentSubmission
      );

    if (
      pendingAttachments.some(
        (attachment) => attachment.status === 'persisting'
      )
    ) {
      return;
    }

    deps.outboxStore.setQueuedSubmissionStatus(currentSubmission.id, 'syncing');
    if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;

    if (currentSubmission.type === 'reply') {
      const parent = await deps.resolveQueuedReplyParent(currentSubmission);

      if (parent.status === 'missing') {
        await deps.discardOrphanedReplySubmission(currentSubmission);
        return;
      }

      currentSubmission = parent.submission;
    }

    if (canPublishQueuedReplyDirectly(currentSubmission, pendingAttachments)) {
      await publishQueuedSubmission(currentSubmission);
      return;
    }

    let isAlreadyPublished =
      await deps.queuedSubmissionIsPublished(currentSubmission);

    for (
      let refreshAttempt = 0;
      refreshAttempt < QUEUED_SUBMISSION_REFRESH_LIMIT;
      refreshAttempt += 1
    ) {
      if (!isAlreadyPublished) {
        const replayed =
          await replayQueuedSubmissionDraftState(currentSubmission);

        if (!replayed) return;
        currentSubmission = replayed;
      }

      const attachmentSync =
        await syncQueuedSubmissionAttachments(currentSubmission);

      if (attachmentSync.status !== 'synced') return;

      const latestSubmission = getCurrentSyncableSubmission(
        currentSubmission.id
      );

      if (!latestSubmission) return;

      const latestAttachments =
        deps.outboxStore.getQueuedAttachmentsForSubmission(
          deps.outboxStore.getOutboxSnapshot(),
          latestSubmission
        );

      const hasNewAttachments = latestAttachments.some(
        (attachment) =>
          attachment.status !== 'uploaded' &&
          !attachmentSync.attemptedAttachmentIds.has(attachment.id)
      );

      const hasDraftChanges =
        !isAlreadyPublished &&
        submissionDraftSyncKey(latestSubmission) !==
          submissionDraftSyncKey(currentSubmission);

      currentSubmission = latestSubmission;
      if (!hasNewAttachments && !hasDraftChanges) break;

      if (refreshAttempt === QUEUED_SUBMISSION_REFRESH_LIMIT - 1) {
        deps.outboxStore.setQueuedSubmissionStatus(
          currentSubmission.id,
          'pending'
        );

        return;
      }

      isAlreadyPublished =
        await deps.queuedSubmissionIsPublished(currentSubmission);
    }

    if (isAlreadyPublished) {
      deps.outboxStore.setQueuedSubmissionStatus(
        currentSubmission.id,
        'complete'
      );
    } else {
      const videoFileIds = getSubmissionVideoFileIds(currentSubmission);

      // Hold finalize — and the notifications publishing fires — until the
      // uploaded video has finished processing on the server.
      if (videoFileIds.length && !(await deps.mediaProcessed(videoFileIds))) {
        deps.outboxStore.setQueuedSubmissionStatus(
          currentSubmission.id,
          'processing'
        );

        return;
      }

      await publishQueuedSubmission(currentSubmission);
    }
  };

  const syncOutboxOnce = async () => {
    await deps.outboxStore.ensureOutboxHydrated();
    if (!(await canStartOutboxNetworkRequests())) return;

    const syncable = deps.outboxStore.getStartableAutoSyncSubmissions(
      deps.outboxStore.getOutboxSnapshot()
    );

    for (const submission of syncable) {
      if (!(await canStartOutboxNetworkRequests())) return;

      try {
        await syncQueuedSubmission(submission);
      } catch (error) {
        const isNetworkOffline = await isOutboxNetworkOffline();

        const currentSubmission = deps.outboxStore
          .getOutboxSnapshot()
          .submissions.find((item) => item.id === submission.id);

        const attachments = currentSubmission
          ? deps.outboxStore.getQueuedAttachmentsForSubmission(
              deps.outboxStore.getOutboxSnapshot(),
              currentSubmission
            )
          : [];

        if (currentSubmission) {
          for (const attachment of attachments) {
            if (attachment.status === 'uploading') {
              deps.outboxStore.setQueuedAttachmentStatus(
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
          !(await deps.queryRecordSyncTarget(currentSubmission.recordId)).exists
        ) {
          await deps.discardOrphanedReplySubmission(currentSubmission);
          continue;
        }

        if (isNetworkOffline) {
          deps.outboxStore.setQueuedSubmissionStatus(submission.id, 'pending');
          continue;
        }

        const message = getErrorMessage(error, 'Sync failed');

        deps.outboxStore.setQueuedSubmissionStatus(
          submission.id,
          'error',
          message
        );
      }
    }

    const discarded = deps.outboxStore.getDiscardedSubmissions(
      deps.outboxStore.getOutboxSnapshot()
    );

    for (const submission of discarded) {
      if (!(await canStartOutboxNetworkRequests())) return;

      try {
        await deps.cleanupDiscardedSubmission(submission);
      } catch {
        // noop
      }
    }

    const queuedRecordPins = deps.outboxStore.getQueuedRecordPins(
      deps.outboxStore.getOutboxSnapshot()
    );

    for (const recordPin of queuedRecordPins) {
      if (!(await isOutboxNetworkReachable())) return;

      try {
        if (!(await deps.queryRecordSyncTarget(recordPin.recordId)).exists) {
          deps.outboxStore.clearQueuedRecordPin({
            recordId: recordPin.recordId,
          });

          continue;
        }

        await deps.applyRecordPin({
          id: recordPin.recordId,
          isPinned: recordPin.isPinned,
        });

        deps.outboxStore.clearQueuedRecordPin({
          isPinned: recordPin.isPinned,
          recordId: recordPin.recordId,
        });
      } catch (error) {
        if (!(await isOutboxNetworkReachable())) return;
        deps.logError('Failed to sync queued record pin', error);
      }
    }
  };

  const runOutboxSync = () => {
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

  return { runOutboxSync, syncOutboxOnce, syncQueuedSubmission };
};
