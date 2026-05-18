import { describe, expect, mock, test } from 'bun:test';
import type * as types from '@/features/offline/types';

const createLinkCalls: unknown[] = [];
const deleteLinkCalls: unknown[] = [];

const createLink = mock(async (input: unknown) => {
  createLinkCalls.push(input);
});

const deleteLink = mock(async (input: unknown) => {
  deleteLinkCalls.push(input);
});

let queryData: unknown = {};
mock.module('@/features/records/mutations/create-link', () => ({ createLink }));
mock.module('@/features/records/mutations/delete-link', () => ({ deleteLink }));

mock.module('@/features/records/mutations/replay-record-draft', () => ({
  replayRecordDraft: mock(async () => undefined),
}));

mock.module('@/features/records/mutations/replay-reply-draft', () => ({
  replayReplyDraft: mock(async () => undefined),
}));

mock.module('@/features/offline/outbox-store', () => ({
  getOutboxSnapshot: () => ({ submissions: [] }),
  updateQueuedSubmission: () => undefined,
}));

mock.module('@/lib/db', () => ({
  db: {
    getAuth: async () => undefined,
    queryOnce: async () => ({ data: queryData }),
  },
}));

const replay = await import('@/features/offline/outbox-sync-draft-replay');

const submission = (
  links: types.QueuedLinkSnapshot[]
): Extract<types.QueuedSubmission, { type: 'record' }> => ({
  contentId: 'record-a',
  createdAt: '2026-05-13T00:00:00.000Z',
  files: [],
  id: 'record:record-a',
  links,
  logId: 'log-a',
  status: 'pending',
  tagIds: [],
  tags: [],
  teamId: 'team-a',
  text: 'Queued record',
  type: 'record',
  updatedAt: '2026-05-13T00:00:00.000Z',
});

describe('outbox draft replay', () => {
  test('replays local links', async () => {
    createLink.mockClear();
    deleteLink.mockClear();
    createLinkCalls.length = 0;
    deleteLinkCalls.length = 0;

    const syncedLink = {
      id: 'link-synced',
      label: 'Synced',
      order: 0,
      teamId: 'team-a',
      url: 'https://example.com/synced',
    };

    const localLink = {
      id: 'link-local',
      label: 'Local',
      localStatus: 'pending' as const,
      order: 1,
      teamId: 'team-a',
      url: 'https://example.com/local',
    };

    queryData = {
      records: [
        {
          id: 'record-a',
          links: [
            syncedLink,
            { id: 'link-stale', label: 'Stale', order: 2, url: 'https://old' },
          ],
        },
      ],
    };

    await replay.replayQueuedSubmissionLinks(
      submission([syncedLink, localLink])
    );

    expect(createLinkCalls).toEqual([
      {
        label: 'Local',
        linkId: 'link-local',
        order: 1,
        parentId: 'record-a',
        parentType: 'record',
        teamId: 'team-a',
        url: 'https://example.com/local',
      },
    ]);

    expect(deleteLinkCalls).toEqual([{ id: 'link-stale' }]);
  });
});
