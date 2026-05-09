import * as reactions from '@/domain/records/reactions';
import { describe, expect, test } from 'bun:test';

type Transaction = {
  entity: string;
  id: string;
  links: unknown;
  update: unknown;
};

const createTxNamespace = (entity: string) =>
  new Proxy(
    {},
    {
      get(_target, id: string | symbol) {
        if (typeof id !== 'string') return undefined;

        return {
          update: (update: unknown) => ({
            link: (links: unknown): Transaction => ({
              entity,
              id,
              links,
              update,
            }),
          }),
        };
      },
    }
  );

const createDb = () =>
  ({
    tx: {
      activities: createTxNamespace('activities'),
      reactions: createTxNamespace('reactions'),
    },
  }) as Parameters<typeof reactions.buildAddReactionTransactions>[0]['db'];

describe('reaction emoji helpers', () => {
  test('recognizes supported reactions and normalizes unsupported input', () => {
    const [defaultEmoji, fireEmoji] = reactions.REACTION_EMOJIS;
    expect(reactions.isReactionEmoji(fireEmoji)).toBe(true);
    expect(reactions.isReactionEmoji('nope')).toBe(false);
    expect(reactions.normalizeReactionEmoji(fireEmoji)).toBe(fireEmoji);
    expect(reactions.normalizeReactionEmoji('nope')).toBe(defaultEmoji);
    expect(reactions.normalizeReactionEmoji(null)).toBe(defaultEmoji);
  });
});

describe('buildAddReactionTransactions', () => {
  test('builds a record reaction without activity when activity context is incomplete', () => {
    const [transaction] = reactions.buildAddReactionTransactions({
      activityId: 'activity-1',
      db: createDb(),
      emoji: reactions.REACTION_EMOJIS[1],
      profileId: 'profile-1',
      reactionId: 'reaction-1',
      recordId: 'record-1',
      teamId: 'team-1',
    });

    expect(transaction).toEqual({
      entity: 'reactions',
      id: 'reaction-1',
      links: { author: 'profile-1', record: 'record-1' },
      update: { emoji: reactions.REACTION_EMOJIS[1], teamId: 'team-1' },
    });
  });

  test('links reply reactions to activity records when activity context is complete', () => {
    const transactions = reactions.buildAddReactionTransactions({
      activityId: 'activity-1',
      db: createDb(),
      emoji: reactions.REACTION_EMOJIS[2],
      logId: 'log-1',
      now: '2026-05-09T00:00:00.000Z',
      profileId: 'profile-1',
      reactionId: 'reaction-1',
      recordId: 'record-1',
      replyId: 'reply-1',
      teamId: 'team-1',
    });

    expect(transactions).toEqual([
      {
        entity: 'reactions',
        id: 'reaction-1',
        links: {
          activity: 'activity-1',
          author: 'profile-1',
          reply: 'reply-1',
        },
        update: { emoji: reactions.REACTION_EMOJIS[2], teamId: 'team-1' },
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
          date: '2026-05-09T00:00:00.000Z',
          emoji: reactions.REACTION_EMOJIS[2],
          teamId: 'team-1',
          type: 'reaction_added',
        },
      },
    ]);
  });
});
