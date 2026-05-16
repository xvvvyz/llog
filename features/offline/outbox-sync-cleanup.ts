import * as outboxStore from '@/features/offline/outbox-store';
import type * as types from '@/features/offline/types';
import { deleteRecord } from '@/features/records/mutations/delete-record';
import { deleteReply } from '@/features/records/mutations/delete-reply';
import { wait } from '@/lib/async';
import { db } from '@/lib/db';

const DRAFT_SYNC_RETRY_COUNT = 20;
const DRAFT_SYNC_RETRY_DELAY_MS = 750;

export const discardOrphanedReplySubmission = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) => {
  await outboxStore.discardQueuedSubmission(submission.id);
  await outboxStore.clearCompletedSubmission(submission.id);
};

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

export const cleanupDiscardedSubmission = async (
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
