import * as outboxState from '@/features/offline/outbox-state';
import type * as types from '@/features/offline/types';

export type OutboxSnapshot = types.PersistedOutbox & { hydrated: boolean };

export const sortQueuedAttachments = <
  T extends Pick<types.QueuedAttachment, 'order'>,
>(
  attachments: T[]
) => [...attachments].sort((a, b) => a.order - b.order);

const sameParent = (
  attachment: types.QueuedAttachment,
  parent: types.QueuedParent
) =>
  attachment.parentType === parent.parentType &&
  attachment.parentId === parent.parentId &&
  attachment.recordId === parent.recordId;

export const submissionOwnsAttachment = outboxState.submissionOwnsAttachment;

export const getDiscardedSubmissionAttachments =
  outboxState.getDiscardedSubmissionAttachments;

export const getDiscardedSubmissions = outboxState.getDiscardedSubmissions;

export const getAutoSyncableSubmissions =
  outboxState.getAutoSyncableSubmissions;

export const getStartableAutoSyncSubmissions =
  outboxState.getStartableAutoSyncSubmissions;

export const getNextAutoRetryTime = outboxState.getNextAutoRetryTime;

export const getPendingOutboxWork = outboxState.getPendingOutboxWork;

export const hasPendingOutboxWork = outboxState.hasPendingOutboxWork;

export const getQueuedRecordPins = (
  state: Pick<OutboxSnapshot, 'recordPins'>
) => state.recordPins;

export const getQueuedRecordPin = (
  state: Pick<OutboxSnapshot, 'recordPins'>,
  recordId?: string
) =>
  recordId
    ? state.recordPins.find((recordPin) => recordPin.recordId === recordId)
    : undefined;

export const getQueuedAttachmentsForParent = (
  state: Pick<OutboxSnapshot, 'attachments'>,
  parent?: types.QueuedParent
) => {
  if (!parent) return [];

  return sortQueuedAttachments(
    state.attachments.filter(
      (attachment) => sameParent(attachment, parent) && !attachment.submissionId
    )
  );
};

export const getQueuedAttachmentsForSubmission = (
  state: Pick<OutboxSnapshot, 'attachments'>,
  submission: types.QueuedSubmission
) =>
  sortQueuedAttachments(
    state.attachments.filter((attachment) =>
      submissionOwnsAttachment(submission, attachment)
    )
  );
