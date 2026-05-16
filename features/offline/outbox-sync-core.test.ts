import { describe, expect, test } from 'bun:test';
import { createOutboxSyncRunner } from '@/features/offline/outbox-sync-runner';
import * as outboxSelectors from '@/features/offline/outbox-selectors';
import type * as types from '@/features/offline/types';

type Dependencies = Parameters<typeof createOutboxSyncRunner>[0];
type OutboxSnapshot = types.PersistedOutbox & { hydrated: boolean };

const fixtures = {
  date: '2026-05-13T00:00:00.000Z',
  fileId: 'file-a',
  logId: 'log-a',
  recordId: 'record-a',
  replyId: 'reply-a',
};

const emptySnapshot = (): OutboxSnapshot => ({
  attachments: [],
  drafts: [],
  hydrated: true,
  recordPins: [],
  submissions: [],
  submittedRecordDraftIds: [],
  version: 1,
});

const queuedAttachment = (
  overrides: Partial<types.QueuedAttachment> = {}
): types.QueuedAttachment => ({
  id: fixtures.fileId,
  localUri: 'file:///file-a.jpg',
  order: 0,
  parentId: fixtures.recordId,
  parentType: 'record',
  recordId: fixtures.recordId,
  status: 'queued',
  type: 'image',
  ...overrides,
});

const queuedRecordSubmission = (
  overrides: Partial<Extract<types.QueuedSubmission, { type: 'record' }>> = {}
): Extract<types.QueuedSubmission, { type: 'record' }> => ({
  contentId: fixtures.recordId,
  createdAt: fixtures.date,
  files: [],
  id: `record:${fixtures.recordId}`,
  links: [],
  logId: fixtures.logId,
  status: 'pending',
  tagIds: [],
  tags: [],
  text: 'Queued record',
  type: 'record',
  updatedAt: fixtures.date,
  ...overrides,
});

const queuedReplySubmission = (
  overrides: Partial<Extract<types.QueuedSubmission, { type: 'reply' }>> = {}
): Extract<types.QueuedSubmission, { type: 'reply' }> => ({
  contentId: fixtures.replyId,
  createdAt: fixtures.date,
  files: [],
  id: `reply:${fixtures.replyId}`,
  links: [],
  recordId: fixtures.recordId,
  status: 'pending',
  text: 'Queued reply',
  type: 'reply',
  updatedAt: fixtures.date,
  ...overrides,
});

const activeSubmissions = (state: Pick<OutboxSnapshot, 'submissions'>) =>
  state.submissions.filter((submission) =>
    ['pending', 'syncing', 'publishing'].includes(submission.status)
  );

const createHarness = ({
  dependencies,
  network = [true],
  snapshot = emptySnapshot(),
}: {
  dependencies?: Partial<Dependencies>;
  network?: boolean[];
  snapshot?: OutboxSnapshot;
} = {}) => {
  const events: string[] = [];
  const networkStates = [...network];

  const store: Dependencies['outboxStore'] = {
    clearQueuedRecordPin: ({ isPinned, recordId }) => {
      events.push(`clear-pin:${recordId}:${isPinned ?? 'any'}`);

      snapshot.recordPins = snapshot.recordPins.filter(
        (recordPin) =>
          recordPin.recordId !== recordId ||
          (isPinned != null && recordPin.isPinned !== isPinned)
      );
    },
    discardQueuedSubmission: async (submissionId) => {
      events.push(`discard:${submissionId}`);

      snapshot.submissions = snapshot.submissions.map((submission) =>
        submission.id === submissionId
          ? { ...submission, status: 'discarded' }
          : submission
      );
    },
    ensureOutboxHydrated: async () => {
      events.push('hydrate');
    },
    getAutoSyncableSubmissions: activeSubmissions,
    getDiscardedSubmissions: (state) =>
      state.submissions.filter(
        (submission) => submission.status === 'discarded'
      ),
    getOutboxSnapshot: () => snapshot,
    getQueuedAttachmentsForSubmission:
      outboxSelectors.getQueuedAttachmentsForSubmission,
    getQueuedRecordPins: outboxSelectors.getQueuedRecordPins,
    getStartableAutoSyncSubmissions: (state) =>
      state.submissions.filter((submission) => submission.status === 'pending'),
    setQueuedAttachmentStatus: (fileId, status, error) => {
      events.push(`attachment:${fileId}:${status}:${error ?? ''}`);

      snapshot.attachments = snapshot.attachments.map((attachment) =>
        attachment.id === fileId ? { ...attachment, error, status } : attachment
      );
    },
    setQueuedSubmissionStatus: (submissionId, status, error) => {
      events.push(`status:${submissionId}:${status}:${error ?? ''}`);

      snapshot.submissions = snapshot.submissions.map((submission) =>
        submission.id === submissionId
          ? { ...submission, error, status }
          : submission
      );
    },
  };

  const deps: Dependencies = {
    applyRecordPin: async ({ id, isPinned }) => {
      events.push(`apply-pin:${id}:${isPinned}`);
    },
    cleanupDiscardedSubmission: async (submission) => {
      events.push(`cleanup:${submission.id}`);
    },
    discardOrphanedReplySubmission: async (submission) => {
      events.push(`discard-orphan:${submission.id}`);
    },
    fetchOutboxNetworkReachability: async () =>
      networkStates.shift() ?? network.at(-1) ?? true,
    isReplyForQueuedRecord: () => false,
    logError: (...args) => {
      events.push(`log:${String(args[0])}`);
    },
    outboxStore: store,
    publishRecord: async ({ id }) => {
      events.push(`publish-record:${id}`);
    },
    publishReply: async ({ id }) => {
      events.push(`publish-reply:${id}`);
    },
    queryRecordSyncTarget: async (recordId) => {
      events.push(`query-target:${recordId}`);
      return { exists: true };
    },
    queuedReplyNeedsDraftReplay: async (submission) => {
      events.push(`needs-replay:${submission.id}`);
      return true;
    },
    queuedSubmissionIsPublished: async (submission) => {
      events.push(`published:${submission.id}`);
      return false;
    },
    rejectAfter: async (promise) => promise,
    replayQueuedRecordDraft: async (submission) => {
      events.push(`replay-record:${submission.id}`);
      return submission;
    },
    replayQueuedReplyDraft: async (submission) => {
      events.push(`replay-reply:${submission.id}`);
      return submission;
    },
    replayQueuedSubmissionLinks: async (submission) => {
      events.push(`links:${submission.id}`);
    },
    resolveQueuedReplyParent: async (submission) => {
      events.push(`resolve-parent:${submission.id}`);
      return { status: 'exists', submission };
    },
    uploadQueuedAttachment: async (attachment, submission) => {
      events.push(`upload:${attachment.id}:${submission.id}`);
    },
    waitForDraftState: async (submission) => {
      events.push(`wait-draft:${submission.id}`);
    },
    ...dependencies,
  };

  return { events, runner: createOutboxSyncRunner(deps), snapshot };
};

describe('outbox sync runner', () => {
  test('syncs record', async () => {
    const snapshot = emptySnapshot();
    const submission = queuedRecordSubmission();
    snapshot.submissions = [submission];

    snapshot.attachments = [
      queuedAttachment({ submissionId: submission.id, status: 'queued' }),
    ];

    const { events, runner } = createHarness({ snapshot });
    await runner.syncQueuedSubmission(submission);

    expect(events).toEqual([
      'status:record:record-a:syncing:',
      'published:record:record-a',
      'replay-record:record:record-a',
      'links:record:record-a',
      'wait-draft:record:record-a',
      'upload:file-a:record:record-a',
      'status:record:record-a:publishing:',
      'publish-record:record-a',
      'status:record:record-a:complete:',
    ]);
  });

  test('publishes reply', async () => {
    const snapshot = emptySnapshot();
    const submission = queuedReplySubmission();
    snapshot.submissions = [submission];
    const { events, runner } = createHarness({ snapshot });
    await runner.syncQueuedSubmission(submission);

    expect(events).toEqual([
      'status:reply:reply-a:syncing:',
      'resolve-parent:reply:reply-a',
      'status:reply:reply-a:publishing:',
      'publish-reply:reply-a',
      'status:reply:reply-a:complete:',
    ]);
  });

  test('resets offline upload', async () => {
    const snapshot = emptySnapshot();
    const submission = queuedRecordSubmission();
    snapshot.submissions = [submission];

    snapshot.attachments = [
      queuedAttachment({ submissionId: submission.id, status: 'uploading' }),
    ];

    const {
      events,
      runner,
      snapshot: current,
    } = createHarness({
      dependencies: {
        uploadQueuedAttachment: async () => {
          throw new Error('Network down');
        },
      },
      network: [true, true, false],
      snapshot,
    });

    await runner.syncOutboxOnce();
    expect(current.attachments[0]?.status).toBe('queued');
    expect(current.submissions[0]?.status).toBe('pending');
    expect(events).toContain('attachment:file-a:queued:Network down');
    expect(events).toContain('status:record:record-a:pending:');
  });

  test('syncs cleanup and pins', async () => {
    const snapshot = emptySnapshot();

    snapshot.submissions = [
      queuedRecordSubmission({
        contentId: 'discarded-record',
        id: 'record:discarded-record',
        status: 'discarded',
      }),
    ];

    snapshot.recordPins = [
      {
        id: 'record-pin:record-a',
        isPinned: true,
        recordId: fixtures.recordId,
        updatedAt: fixtures.date,
      },
    ];

    const { events, runner } = createHarness({
      network: [true, true, true],
      snapshot,
    });

    await runner.syncOutboxOnce();
    expect(events).toContain('cleanup:record:discarded-record');
    expect(events).toContain('apply-pin:record-a:true');
    expect(events).toContain('clear-pin:record-a:true');
  });
});
