import { createLink } from '@/features/records/mutations/create-link';
import { deleteLink } from '@/features/records/mutations/delete-link';
import { replayRecordDraft } from '@/features/records/mutations/replay-record-draft';
import { replayReplyDraft } from '@/features/records/mutations/replay-reply-draft';
import * as outboxStore from '@/features/offline/outbox-store';
import * as outboxState from '@/features/offline/outbox-state';
import type * as types from '@/features/offline/types';
import { wait } from '@/lib/async';
import { db } from '@/lib/db';

const DRAFT_SYNC_RETRY_COUNT = 20;
const DRAFT_SYNC_RETRY_DELAY_MS = 750;

const idsMatchExactly = (
  expected: string[],
  actual: { id?: string }[] = []
) => {
  const actualIds = new Set(actual.map((item) => item.id).filter(Boolean));
  if (actualIds.size !== expected.length) return false;
  return expected.every((id) => actualIds.has(id));
};

export const queryRecordDraft = async (
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

export const queryReplyDraft = async (
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

export const queryRecordSyncTarget = async (recordId: string) => {
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

export const waitForDraftState = async (submission: types.QueuedSubmission) => {
  for (let attempt = 0; attempt < DRAFT_SYNC_RETRY_COUNT; attempt += 1) {
    if (await draftMatchesSubmission(submission)) return;
    await wait(DRAFT_SYNC_RETRY_DELAY_MS);
  }

  throw new Error('Draft has not synced yet.');
};

export const replayQueuedReplyDraft = async (
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

export const replayQueuedRecordDraft = async (
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

export const resolveQueuedReplyParent = async (
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

export const replayQueuedSubmissionLinks = async (
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

export const queuedReplyNeedsDraftReplay = async (
  submission: Extract<types.QueuedSubmission, { type: 'reply' }>
) => {
  const reply = await queryReplyDraft(submission);
  return !reply || reply.isDraft !== false;
};

export const queuedSubmissionIsPublished = async (
  submission: types.QueuedSubmission
) => {
  const content =
    submission.type === 'record'
      ? await queryRecordDraft(submission)
      : await queryReplyDraft(submission);

  return content?.isDraft === false;
};

export const isReplyForQueuedRecord = (
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
