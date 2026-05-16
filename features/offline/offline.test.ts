import { describe, expect, test } from 'bun:test';
import * as localEntry from '@/features/offline/local-entry';
import * as outboxNormalize from '@/features/offline/outbox-normalize';
import * as outboxState from '@/features/offline/outbox-state';
import * as persistence from '@/features/offline/persistence';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as queuedLinks from '@/features/offline/queued-links';
import type * as types from '@/features/offline/types';

const fixtures = {
  date: '2026-05-13T00:00:00.000Z',
  fileId: 'file-a',
  logId: 'log-a',
  profileId: 'profile-a',
  recordId: 'record-a',
  replyId: 'reply-a',
  teamId: 'team-a',
};

const queuedAttachment = (
  overrides: Partial<types.QueuedAttachment>
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

const queuedFile = (
  overrides: Partial<types.QueuedFileSnapshot>
): types.QueuedFileSnapshot => ({
  id: fixtures.fileId,
  order: 0,
  type: 'image',
  uri: 'https://example.com/file.jpg',
  ...overrides,
});

describe('persistence', () => {
  test('normalizes invalid data', () => {
    expect(persistence.parsePersistedOutbox('{not json')).toEqual(
      persistence.emptyPersistedOutbox()
    );

    expect(persistence.normalizePersistedOutbox({ submissions: [] })).toEqual({
      attachments: [],
      drafts: [],
      recordPins: [],
      submissions: [],
      version: 1,
    });
  });

  test('scopes keys', () => {
    expect(persistence.getPersistedOutboxStorageKey()).toBe(
      'llog.offlineOutbox.v1'
    );

    expect(persistence.getPersistedOutboxStorageKey('user:a@example.com')).toBe(
      'llog.offlineOutbox.v1:user%3Aa%40example.com'
    );
  });
});

describe('pending entries', () => {
  test('preserves previews', () => {
    const files = [
      queuedAttachment({ id: 'late', localUri: 'file:///late.jpg', order: 2 }),
      queuedAttachment({
        id: 'early',
        localUri: 'file:///early.jpg',
        order: 0,
      }),
    ]
      .sort((a, b) => a.order - b.order)
      .map(pendingEntries.queuedAttachmentToFileItem);

    expect(files.map((file) => [file.id, file.uri])).toEqual([
      ['early', 'file:///early.jpg'],
      ['late', 'file:///late.jpg'],
    ]);
  });
});

describe('outbox state', () => {
  test('resets in-flight work', () => {
    const reset = outboxState.resetInFlightOutboxWork({
      attachments: [
        queuedAttachment({ id: 'uploading-file', status: 'uploading' }),
        queuedAttachment({ id: 'uploaded-file', status: 'uploaded' }),
      ],
      submissions: [queuedRecordSubmission({ status: 'syncing' })],
    });

    expect(reset.attachments.map((item) => [item.id, item.status])).toEqual([
      ['uploading-file', 'queued'],
      ['uploaded-file', 'uploaded'],
    ]);

    expect(reset.submissions[0]?.status).toBe('pending');
  });

  test('ignores discarded media', () => {
    const state = {
      attachments: [
        queuedAttachment({
          id: 'orphaned-file',
          parentId: fixtures.recordId,
          submissionId: undefined,
        }),
      ],
      submissions: [queuedRecordSubmission({ status: 'discarded' })],
    };

    expect(outboxState.hasPendingOutboxWork(state)).toBe(false);

    expect(
      outboxState.getDiscardedSubmissions(state).map((item) => item.id)
    ).toEqual(['record:record-a']);

    expect(
      outboxState
        .getDiscardedSubmissionAttachments(state)
        .map((item) => item.id)
    ).toEqual(['orphaned-file']);
  });

  test('tracks pending media', () => {
    const state = {
      attachments: [
        queuedAttachment({
          id: 'pending-file',
          parentId: fixtures.recordId,
          submissionId: undefined,
        }),
      ],
      submissions: [queuedRecordSubmission({ status: 'pending' })],
    };

    expect(outboxState.hasPendingOutboxWork(state)).toBe(true);
  });

  test('schedules failed work', () => {
    const state = {
      attachments: [
        queuedAttachment({
          status: 'error',
          submissionId: `record:${fixtures.recordId}`,
        }),
      ],
      submissions: [
        queuedRecordSubmission({
          nextRetryAt: '2999-05-13T00:01:00.000Z',
          status: 'error',
        }),
      ],
    };

    expect(
      outboxState.getAutoSyncableSubmissions(state).map((item) => item.id)
    ).toEqual([]);

    expect(outboxState.getNextAutoRetryTime(state)).toBe(
      Date.parse('2999-05-13T00:01:00.000Z')
    );

    expect(outboxState.hasPendingOutboxWork(state)).toBe(false);
  });

  test('retries due work', () => {
    const state = {
      attachments: [],
      submissions: [
        queuedRecordSubmission({
          nextRetryAt: '2000-05-12T23:59:00.000Z',
          status: 'error',
        }),
        queuedRecordSubmission({
          contentId: 'record-b',
          id: 'record:record-b',
          nextRetryAt: '2999-05-13T00:01:00.000Z',
          status: 'error',
        }),
      ],
    };

    expect(
      outboxState.getAutoSyncableSubmissions(state).map((item) => item.id)
    ).toEqual(['record:record-a']);

    expect(outboxState.getAutoRetryDelayMs(1)).toBe(5_000);
    expect(outboxState.getAutoRetryDelayMs(7)).toBe(300_000);
  });

  test('starts runnable work only', () => {
    const state = {
      attachments: [],
      submissions: [
        queuedRecordSubmission({ status: 'pending' }),
        queuedRecordSubmission({
          contentId: 'record-b',
          id: 'record:record-b',
          status: 'syncing',
        }),
        queuedRecordSubmission({
          contentId: 'record-c',
          id: 'record:record-c',
          nextRetryAt: '2000-05-12T23:59:00.000Z',
          status: 'error',
        }),
        queuedRecordSubmission({
          contentId: 'record-d',
          id: 'record:record-d',
          status: 'discarded',
        }),
      ],
    };

    expect(
      outboxState.getStartableAutoSyncSubmissions(state).map((item) => item.id)
    ).toEqual(['record:record-a', 'record:record-c']);
  });
});

describe('outbox normalize', () => {
  test('normalizes file snapshots', () => {
    expect(
      outboxNormalize.normalizeQueuedFileSnapshots([
        queuedFile({ id: '', order: 0 }),
        queuedFile({ id: 'late', order: 2 }),
        queuedFile({ id: 'early', order: undefined }),
      ])
    ).toEqual([
      {
        id: 'early',
        order: 0,
        type: 'image',
        uri: 'https://example.com/file.jpg',
      },
      {
        id: 'late',
        order: 2,
        type: 'image',
        uri: 'https://example.com/file.jpg',
      },
    ]);
  });
});

describe('outbox state', () => {
  test('merges hydration races', () => {
    const merged = outboxState.mergeOutboxForHydration({
      current: {
        attachments: [queuedAttachment({ id: 'new-file' })],
        drafts: [],
        hydrated: false,
        ownerUserId: 'user-a',
        recordPins: [
          {
            id: 'record-pin:new-record',
            isPinned: true,
            recordId: 'new-record',
            updatedAt: fixtures.date,
          },
        ],
        submissions: [queuedRecordSubmission({ contentId: 'new-record' })],
        version: 1,
      },
      persisted: {
        attachments: [
          queuedAttachment({ id: 'persisted-file', status: 'uploading' }),
        ],
        drafts: [],
        ownerUserId: 'user-a',
        recordPins: [
          {
            id: 'record-pin:persisted-record',
            isPinned: false,
            recordId: 'persisted-record',
            updatedAt: fixtures.date,
          },
        ],
        submissions: [
          queuedRecordSubmission({
            contentId: 'persisted-record',
            id: 'record:persisted-record',
            status: 'publishing',
          }),
        ],
        version: 1,
      },
    });

    expect(merged.hydrated).toBe(true);
    expect(merged.ownerUserId).toBe('user-a');

    expect(merged.attachments.map((item) => [item.id, item.status])).toEqual([
      ['persisted-file', 'queued'],
      ['new-file', 'queued'],
    ]);

    expect(merged.submissions.map((item) => [item.id, item.status])).toEqual([
      ['record:persisted-record', 'pending'],
      ['record:record-a', 'pending'],
    ]);

    expect(
      merged.recordPins.map((item) => [item.recordId, item.isPinned])
    ).toEqual([
      ['persisted-record', false],
      ['new-record', true],
    ]);
  });
});

describe('outbox state', () => {
  test('matches links exactly', () => {
    const links = [
      {
        id: 'link-a',
        label: 'Release notes',
        order: 0,
        teamId: 'team-a',
        url: 'https://example.com',
      },
    ];

    expect(outboxState.queuedLinkSnapshotsMatchExactly(links, links)).toBe(
      true
    );

    expect(
      outboxState.queuedLinkSnapshotsMatchExactly(
        [],
        [{ id: 'stale-link', label: 'Old', order: 0, url: 'https://old.test' }]
      )
    ).toBe(false);

    expect(
      outboxState.queuedLinkSnapshotsMatchExactly(links, [
        { ...links[0], url: 'https://stale.test' },
      ])
    ).toBe(false);
  });
});

describe('queued links', () => {
  test('normalizes snapshots', () => {
    expect(
      queuedLinks.toQueuedLinkSnapshot({
        id: 'link-a',
        label: 'Docs',
        localStatus: 'pending',
        order: 0,
        teamId: fixtures.teamId,
        url: 'https://example.com/docs',
      })
    ).toEqual({
      id: 'link-a',
      label: 'Docs',
      localStatus: 'pending',
      order: 0,
      teamId: fixtures.teamId,
      url: 'https://example.com/docs',
    });

    expect(
      queuedLinks.toQueuedLinkSnapshot({
        id: 'link-b',
        label: 'Invalid status',
        localStatus: 'uploaded',
        order: 1,
        teamId: fixtures.teamId,
        url: 'https://example.com/invalid',
      })
    ).not.toHaveProperty('localStatus');
  });

  test('selects replayable links', () => {
    expect(
      queuedLinks
        .getReplayableQueuedLinks([
          {
            id: 'link-a',
            label: 'Pending',
            localStatus: 'pending',
            order: 0,
            teamId: fixtures.teamId,
            url: 'https://example.com/a',
          },
          {
            id: 'link-b',
            label: 'Synced',
            order: 1,
            teamId: fixtures.teamId,
            url: 'https://example.com/b',
          },
        ])
        .map((link) => link.id)
    ).toEqual(['link-a']);
  });
});

describe('local entries', () => {
  test('detects local metadata', () => {
    expect(localEntry.hasLocalStatus({ localStatus: 'pending' })).toBe(true);
    expect(localEntry.hasLocalStatus({ status: 'pending' })).toBe(false);

    expect(localEntry.needsIdentityReplay({ needsIdentityReplay: true })).toBe(
      true
    );

    expect(localEntry.needsIdentityReplay({ needsIdentityReplay: false })).toBe(
      false
    );
  });
});

describe('pending entries', () => {
  test('keeps draft files', () => {
    const queuedRecord = pendingEntries.queuedRecordToEntry({
      attachments: [
        queuedAttachment({ id: 'queued-file', localUri: 'file:///local.jpg' }),
      ],
      profile: { id: fixtures.profileId, name: 'Member' },
      submission: queuedRecordSubmission({
        files: [
          queuedFile({
            id: 'uploaded-file',
            order: 0,
            uri: 'https://example.com/uploaded.jpg',
          }),
        ],
      }),
    });

    expect(queuedRecord.files?.map((file) => [file.id, file.uri])).toEqual([
      ['uploaded-file', 'https://example.com/uploaded.jpg'],
      ['queued-file', 'file:///local.jpg'],
    ]);
  });

  test('keeps pending file sources', () => {
    const queuedRecord = pendingEntries.queuedRecordToEntry({
      attachments: [
        queuedAttachment({
          id: fixtures.fileId,
          localUri: 'file:///local.jpg',
        }),
      ],
      profile: { id: fixtures.profileId, name: 'Member' },
      submission: queuedRecordSubmission({
        files: [
          queuedFile({
            id: fixtures.fileId,
            order: 0,
            uri: 'https://example.com/uploaded.jpg',
          }),
        ],
      }),
    });

    const [record] = pendingEntries.mergePendingRecords(
      [
        {
          files: [{ id: fixtures.fileId, order: 0, type: 'image' }],
          id: fixtures.recordId,
        },
      ],
      [queuedRecord]
    ) as { files?: { id: string; uri?: string }[]; localStatus?: string }[];

    expect(record.files?.map((file) => [file.id, file.uri])).toEqual([
      [fixtures.fileId, 'https://example.com/uploaded.jpg'],
    ]);

    expect(record.localStatus).toBe('pending');
  });

  test('keeps sync errors', () => {
    const queuedRecord = pendingEntries.queuedRecordToEntry({
      attachments: [],
      profile: { id: fixtures.profileId, name: 'Member' },
      submission: queuedRecordSubmission({
        error: 'Upload failed because the file is too large.',
        status: 'error',
      }),
    });

    expect(queuedRecord.syncError).toBe(
      'Upload failed because the file is too large.'
    );

    const queuedReply = pendingEntries.queuedReplyToEntry({
      attachments: [
        queuedAttachment({
          error: 'Upload timed out.',
          parentId: fixtures.replyId,
          parentType: 'reply',
          recordId: fixtures.recordId,
          status: 'error',
          submissionId: `reply:${fixtures.replyId}`,
        }),
      ],
      submission: queuedReplySubmission(),
    });

    expect(queuedReply.syncError).toBe('Upload timed out.');
  });

  test('merges records', () => {
    const queuedRecord = pendingEntries.queuedRecordToEntry({
      attachments: [queuedAttachment({ id: 'queued-file' })],
      profile: { id: fixtures.profileId, name: 'Member' },
      submission: queuedRecordSubmission(),
    });

    expect(
      pendingEntries
        .mergePendingRecords(
          [{ id: 'record-b' }, { id: 'record-a' }],
          [queuedRecord]
        )
        .map((record) => record.id)
    ).toEqual(['record-b', 'record-a']);

    expect(
      pendingEntries
        .mergePendingRecords([{ id: 'record-b' }], [queuedRecord])
        .map((record) => record.id)
    ).toEqual(['record-a', 'record-b']);
  });

  test('keeps completed submissions visible', () => {
    const queuedRecord = pendingEntries.queuedRecordToEntry({
      attachments: [],
      profile: { id: fixtures.profileId, name: 'Member' },
      submission: queuedRecordSubmission({ status: 'complete' }),
    });

    expect(
      pendingEntries
        .mergePendingRecords([{ id: 'record-b' }], [queuedRecord])
        .map((record) => record.id)
    ).toEqual(['record-a', 'record-b']);

    expect(
      pendingEntries
        .mergePendingRecords([{ id: fixtures.recordId }], [queuedRecord])
        .map((record) => record.id)
    ).toEqual([fixtures.recordId]);
  });

  test('merges replies', () => {
    const queuedReply = pendingEntries.queuedReplyToEntry({
      attachments: [],
      profile: { id: fixtures.profileId, name: 'Member' },
      submission: queuedReplySubmission({ status: 'error' }),
    });

    expect(
      pendingEntries
        .mergePendingReplies([{ id: 'reply-b' }], [queuedReply])
        .map((reply) => reply.id)
    ).toEqual(['reply-b', 'reply-a']);
  });

  test('orders replies', () => {
    const queuedReply = pendingEntries.queuedReplyToEntry({
      attachments: [],
      profile: { id: fixtures.profileId, name: 'Member' },
      submission: queuedReplySubmission({
        createdAt: '2026-05-13T00:00:00.000Z',
        status: 'pending',
      }),
    });

    expect(
      pendingEntries
        .mergePendingReplies(
          [{ date: '2026-05-13T12:00:00.000Z', id: 'reply-b' }],
          [queuedReply]
        )
        .map((reply) => reply.id)
    ).toEqual(['reply-a', 'reply-b']);
  });

  test('keeps pending reply data', () => {
    const queuedReply = pendingEntries.queuedReplyToEntry({
      attachments: [],
      submission: queuedReplySubmission({
        createdAt: '2026-05-13T12:00:00.000Z',
        text: 'Pending reply',
      }),
    });

    expect(
      pendingEntries.mergePendingReplies(
        [
          {
            date: '2026-05-13T00:00:00.000Z',
            files: [],
            id: fixtures.replyId,
            text: 'Older live reply',
          },
        ],
        [queuedReply]
      )[0]
    ).toMatchObject({
      date: '2026-05-13T12:00:00.000Z',
      id: fixtures.replyId,
      localStatus: 'pending',
      text: 'Pending reply',
    });
  });

  test('keeps reply replay flags', () => {
    expect(
      pendingEntries.queuedReplyToEntry({
        attachments: [],
        submission: queuedReplySubmission({ needsDraftReplay: false }),
      }).localNeedsDraftReplay
    ).toBe(false);

    const replayReply = pendingEntries.queuedReplyToEntry({
      attachments: [],
      submission: queuedReplySubmission({
        needsDraftReplay: true,
        status: 'complete',
      }),
    });

    expect(replayReply.localNeedsDraftReplay).toBe(true);
    expect(replayReply.localOutboxStatus).toBe('complete');
  });
});
