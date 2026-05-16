import type * as types from '@/features/offline/types';

const QUEUED_SUBMISSION_PUBLISH_TIMEOUT_MS = 45_000;

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

  const isCurrentSubmissionSyncable = (submissionId: string) =>
    deps.outboxStore
      .getAutoSyncableSubmissions(deps.outboxStore.getOutboxSnapshot())
      .some((submission) => submission.id === submissionId);

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

    const isAlreadyPublished =
      await deps.queuedSubmissionIsPublished(currentSubmission);

    if (!isAlreadyPublished) {
      if (currentSubmission.type === 'record') {
        currentSubmission =
          await deps.replayQueuedRecordDraft(currentSubmission);
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
    }

    const attachments = deps.outboxStore.getQueuedAttachmentsForSubmission(
      deps.outboxStore.getOutboxSnapshot(),
      currentSubmission
    );

    if (attachments.some((attachment) => attachment.status === 'persisting')) {
      deps.outboxStore.setQueuedSubmissionStatus(
        currentSubmission.id,
        'pending'
      );

      return;
    }

    for (const attachment of attachments) {
      if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;
      await deps.uploadQueuedAttachment(attachment, currentSubmission);
    }

    if (!isCurrentSubmissionSyncable(currentSubmission.id)) return;

    if (isAlreadyPublished) {
      deps.outboxStore.setQueuedSubmissionStatus(
        currentSubmission.id,
        'complete'
      );
    } else {
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
