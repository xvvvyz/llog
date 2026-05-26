import * as publish from '@/domain/records/publish';
import { describe, expect, test } from 'bun:test';

type Transaction = {
  entity: string;
  id: string;
  links?: unknown;
  update: unknown;
};

const createTxNamespace = (entity: string) =>
  new Proxy(
    {},
    {
      get(_target, id: string | symbol) {
        if (typeof id !== 'string') return undefined;

        return {
          update: (update: unknown) => {
            const transaction = { entity, id, update } as Transaction & {
              link: (links: unknown) => Transaction;
            };

            Object.defineProperty(transaction, 'link', {
              value: (links: unknown): Transaction => ({
                entity,
                id,
                links,
                update,
              }),
            });

            return transaction;
          },
        };
      },
    }
  );

const createDb = () =>
  ({
    tx: {
      activities: createTxNamespace('activities'),
      replies: createTxNamespace('replies'),
    },
  }) as Parameters<typeof publish.buildPublishDraftReplyTransactions>[0]['db'];

describe('record publish', () => {
  test('dates replies on publish', () => {
    const transactions = publish.buildPublishDraftReplyTransactions({
      activityDate: '2026-05-13T12:00:00.000Z',
      activityId: 'activity-1',
      actorId: 'profile-1',
      db: createDb(),
      logId: 'log-1',
      recordId: 'record-1',
      replyId: 'reply-1',
      teamId: 'team-1',
      text: 'Published reply',
    });

    expect(transactions as unknown).toEqual([
      {
        entity: 'replies',
        id: 'reply-1',
        update: {
          date: '2026-05-13T12:00:00.000Z',
          isDraft: false,
          text: 'Published reply',
        },
      },
      {
        entity: 'activities',
        id: 'activity-1',
        links: {
          actor: 'profile-1',
          log: 'log-1',
          record: 'record-1',
          reply: 'reply-1',
          team: 'team-1',
        },
        update: {
          date: '2026-05-13T12:00:00.000Z',
          teamId: 'team-1',
          type: 'reply_posted',
        },
      },
    ]);
  });
});
