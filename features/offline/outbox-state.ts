import type * as types from '@/features/offline/types';

type OutboxState = Pick<types.PersistedOutbox, 'attachments' | 'submissions'>;

const AUTO_SYNCABLE_SUBMISSION_STATUSES = new Set<types.OutboxStatus>([
  'pending',
  'syncing',
  'publishing',
]);

const ACTIVE_SYNC_SUBMISSION_STATUSES = new Set<types.OutboxStatus>([
  'pending',
  'syncing',
  'publishing',
]);

const ACTIVE_ATTACHMENT_STATUSES = new Set<types.QueuedAttachmentStatus>([
  'persisting',
  'queued',
  'uploading',
  'error',
]);

const AUTO_RETRY_BASE_DELAY_MS = 5_000;
const AUTO_RETRY_MAX_DELAY_MS = 5 * 60_000;

export const getAutoRetryDelayMs = (retryCount: number) =>
  Math.min(
    AUTO_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, retryCount - 1),
    AUTO_RETRY_MAX_DELAY_MS
  );

export const getNextAutoRetryAt = ({
  now = Date.now(),
  retryCount,
}: {
  now?: number;
  retryCount: number;
}) => new Date(now + getAutoRetryDelayMs(retryCount)).toISOString();

const isRetryDue = (
  submission: Pick<types.QueuedSubmission, 'nextRetryAt' | 'status'>,
  now = Date.now()
) =>
  submission.status === 'error' &&
  (!submission.nextRetryAt ||
    Number.isNaN(Date.parse(submission.nextRetryAt)) ||
    Date.parse(submission.nextRetryAt) <= now);

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

export const getAutoSyncableSubmissions = (
  state: Pick<OutboxState, 'submissions'>
) =>
  state.submissions.filter(
    (submission) =>
      AUTO_SYNCABLE_SUBMISSION_STATUSES.has(submission.status) ||
      isRetryDue(submission)
  );

export const getStartableAutoSyncSubmissions = (
  state: Pick<OutboxState, 'submissions'>
) =>
  state.submissions.filter(
    (submission) => submission.status === 'pending' || isRetryDue(submission)
  );

export const getNextAutoRetryTime = (
  state: Pick<OutboxState, 'submissions'>
) => {
  const times = state.submissions
    .filter((submission) => submission.status === 'error')
    .map((submission) =>
      submission.nextRetryAt ? Date.parse(submission.nextRetryAt) : Date.now()
    )
    .filter((time) => !Number.isNaN(time));

  return times.length ? Math.min(...times) : undefined;
};

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
  outbox: Pick<
    types.PersistedOutbox,
    'attachments' | 'drafts' | 'recordPins' | 'submissions'
  >
) =>
  outbox.attachments.length > 0 ||
  outbox.drafts.length > 0 ||
  outbox.recordPins.length > 0 ||
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
      ? {
          ...submission,
          error: undefined,
          nextRetryAt: undefined,
          status: 'pending',
        }
      : submission
  ) as T['submissions'],
});

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
    recordPins: mergeById(normalizedPersisted.recordPins, current.recordPins),
    submissions: mergeById(
      normalizedPersisted.submissions,
      current.submissions
    ),
    version: 1,
  };
};
