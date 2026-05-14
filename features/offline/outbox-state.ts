import type * as types from '@/features/offline/types';

type OutboxState = Pick<types.PersistedOutbox, 'attachments' | 'submissions'>;

const AUTO_SYNCABLE_SUBMISSION_STATUSES = new Set<types.OutboxStatus>([
  'pending',
  'syncing',
  'publishing',
]);

const RETRYABLE_SUBMISSION_STATUSES = new Set<types.OutboxStatus>([
  'pending',
  'syncing',
  'publishing',
  'error',
]);

const ACTIVE_SYNC_SUBMISSION_STATUSES = new Set<types.OutboxStatus>([
  'pending',
  'syncing',
  'publishing',
]);

const ACTIVE_ATTACHMENT_STATUSES = new Set<types.QueuedAttachmentStatus>([
  'queued',
  'uploading',
  'error',
]);

export const submissionOwnsAttachment = (
  submission: types.QueuedSubmission,
  attachment: types.QueuedAttachment
) => {
  if (attachment.submissionId) return attachment.submissionId === submission.id;

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
};

export const getAttachmentsForSubmissions = (
  state: Pick<OutboxState, 'attachments'>,
  submissions: types.QueuedSubmission[]
) =>
  state.attachments.filter((attachment) =>
    submissions.some((submission) =>
      submissionOwnsAttachment(submission, attachment)
    )
  );

export const getDiscardedSubmissionAttachments = (state: OutboxState) =>
  getAttachmentsForSubmissions(
    state,
    state.submissions.filter((submission) => submission.status === 'discarded')
  );

export const getDiscardedSubmissions = (
  state: Pick<OutboxState, 'submissions'>
) =>
  state.submissions.filter((submission) => submission.status === 'discarded');

export const getRetryableSubmissions = (
  state: Pick<OutboxState, 'submissions'>
) =>
  state.submissions.filter((submission) =>
    RETRYABLE_SUBMISSION_STATUSES.has(submission.status)
  );

export const getSyncableSubmissions = getRetryableSubmissions;

export const getAutoSyncableSubmissions = (
  state: Pick<OutboxState, 'submissions'>
) =>
  state.submissions.filter((submission) =>
    AUTO_SYNCABLE_SUBMISSION_STATUSES.has(submission.status)
  );

export const getPendingOutboxWork = (state: OutboxState) => {
  const submissions = state.submissions.filter((submission) =>
    ACTIVE_SYNC_SUBMISSION_STATUSES.has(submission.status)
  );

  const attachments = getAttachmentsForSubmissions(state, submissions).filter(
    (attachment) => ACTIVE_ATTACHMENT_STATUSES.has(attachment.status)
  );

  return { attachments, submissions };
};

export const hasPendingOutboxWork = (state: OutboxState) => {
  const work = getPendingOutboxWork(state);
  return work.submissions.length > 0 || work.attachments.length > 0;
};

export const hasOutboxContent = (
  outbox: Pick<types.PersistedOutbox, 'attachments' | 'drafts' | 'submissions'>
) =>
  outbox.attachments.length > 0 ||
  outbox.drafts.length > 0 ||
  outbox.submissions.length > 0;

export const resetInFlightOutboxWork = <T extends OutboxState>(
  state: T
): T => ({
  ...state,
  attachments: state.attachments.map((attachment) =>
    attachment.status === 'uploading'
      ? { ...attachment, error: undefined, status: 'queued' }
      : attachment
  ),
  submissions: state.submissions.map((submission) =>
    submission.status === 'syncing' || submission.status === 'publishing'
      ? { ...submission, error: undefined, status: 'pending' }
      : submission
  ) as T['submissions'],
});

export const retryOutboxSubmission = <T extends OutboxState>(
  state: T,
  submissionId: string
): T => {
  const submission = state.submissions.find((item) => item.id === submissionId);
  if (!submission) return state;

  return {
    ...state,
    attachments: state.attachments.map((attachment) =>
      submissionOwnsAttachment(submission, attachment) &&
      (attachment.status === 'error' || attachment.status === 'uploading')
        ? { ...attachment, error: undefined, status: 'queued' }
        : attachment
    ),
    submissions: state.submissions.map((submission) =>
      submission.id === submissionId && submission.status === 'error'
        ? { ...submission, error: undefined, status: 'pending' }
        : submission
    ) as T['submissions'],
  };
};

const linkSnapshotKey = (
  link: Omit<types.QueuedLinkSnapshot, 'teamId'> & { teamId?: string }
) =>
  [link.id, link.label, link.order, link.teamId ?? '', link.url].join('\u0000');

export const queuedLinkSnapshotsMatchExactly = (
  expected: types.QueuedLinkSnapshot[],
  actual: Partial<types.QueuedLinkSnapshot>[] = []
) => {
  if (actual.length !== expected.length) return false;
  const expectedKeys = new Set(expected.map(linkSnapshotKey));
  if (expectedKeys.size !== expected.length) return false;
  const actualKeys = new Set<string>();

  for (const link of actual) {
    if (
      typeof link.id !== 'string' ||
      typeof link.label !== 'string' ||
      typeof link.order !== 'number' ||
      typeof link.url !== 'string'
    ) {
      return false;
    }

    actualKeys.add(
      linkSnapshotKey({
        id: link.id,
        label: link.label,
        order: link.order,
        teamId: link.teamId,
        url: link.url,
      })
    );
  }

  return (
    actualKeys.size === expectedKeys.size &&
    [...actualKeys].every((key) => expectedKeys.has(key))
  );
};

const mergeById = <T extends { id: string }>(persisted: T[], current: T[]) => {
  const merged = new Map<string, T>();
  for (const item of persisted) merged.set(item.id, item);
  for (const item of current) merged.set(item.id, item);
  return [...merged.values()];
};

export const mergeOutboxForHydration = ({
  current,
  persisted,
}: {
  current: types.PersistedOutbox & { hydrated: boolean };
  persisted: types.PersistedOutbox;
}): types.PersistedOutbox & { hydrated: boolean } => {
  const normalizedPersisted = resetInFlightOutboxWork(persisted);

  if (current.hydrated || !hasOutboxContent(current)) {
    return {
      ...normalizedPersisted,
      hydrated: true,
      ownerUserId: normalizedPersisted.ownerUserId ?? current.ownerUserId,
    };
  }

  return {
    attachments: mergeById(
      normalizedPersisted.attachments,
      current.attachments
    ),
    drafts: mergeById(normalizedPersisted.drafts, current.drafts),
    hydrated: true,
    ownerUserId: current.ownerUserId ?? normalizedPersisted.ownerUserId,
    submissions: mergeById(
      normalizedPersisted.submissions,
      current.submissions
    ),
    version: 1,
  };
};
