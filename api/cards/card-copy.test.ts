import * as cardCopy from '@/api/cards/card-copy';
import { Role } from '@/domain/teams/role';
import { describe, expect, test } from 'bun:test';

const entityTx = (entity: string) =>
  new Proxy(
    {},
    {
      get: (_target, id: string) => ({
        link: (links: Record<string, string>) => ({ entity, id, links }),
        update: (fields: Record<string, unknown>) => {
          const transaction = { entity, fields, id };

          return {
            ...transaction,
            link: (links: Record<string, string>) => ({
              ...transaction,
              links,
            }),
          };
        },
      }),
    }
  );

type Transaction = {
  entity: string;
  fields?: Record<string, unknown>;
  id: string;
  links?: Record<string, string>;
};

const createDb = ({
  cards = [],
  sourceTags = [
    { color: 2, id: 'source-ideas', name: 'Ideas' },
    { color: 4, id: 'source-reading', name: 'Reading' },
  ],
  tags = [
    {
      id: 'target-ideas',
      logs: [{ id: 'target-log' }],
      name: 'ideas',
      order: 0,
      teamId: 'target-team',
      type: 'record',
    },
  ],
  targetLogs = [
    {
      id: 'target-log',
      team: { roles: [{ role: Role.Admin }] },
      teamId: 'target-team',
    },
  ],
  transactions,
}: {
  cards?: { logId?: string; order?: number }[];
  sourceTags?: { color?: number; id: string; name?: string }[];
  tags?: {
    id: string;
    logs?: { id: string }[];
    name?: string;
    order?: number;
    teamId?: string;
    type?: string;
  }[];
  targetLogs?: {
    id: string;
    team: { roles: { role: string }[] };
    teamId: string;
  }[];
  transactions: Transaction[];
}) => ({
  query: async (query: Record<string, unknown>) => {
    if ('cards' in query) {
      const cardsQuery = query.cards as {
        $: { where: { id?: string; logId?: { $in: string[] } } };
      };

      if (cardsQuery.$.where.id) {
        return {
          cards: [
            {
              id: 'card-source',
              logId: 'source-log',
              output: {
                chart: {
                  data: [{ label: 'Week 1', value: 1 }],
                  title: 'Progress trend',
                  type: 'line',
                },
                metrics: [{ label: 'Average', unit: 'hrs', value: 1 }],
                milestones: [],
                sourceRecordIds: ['source-record'],
              },
              prompt: 'Track progress',
              tags: sourceTags,
              teamId: 'source-team',
              title: 'Progress',
            },
          ],
        };
      }

      return { cards };
    }

    if ('logs' in query) {
      const logsQuery = query.logs as {
        $: { where: { id: string | { $in: string[] } } };
      };

      if (typeof logsQuery.$.where.id === 'string') {
        return {
          logs: [
            {
              id: 'source-log',
              team: { roles: [{ role: Role.Owner }] },
              teamId: 'source-team',
            },
          ],
        };
      }

      return { logs: targetLogs };
    }

    if ('tags' in query) return { tags };
    return {};
  },
  transact: async (transaction: Transaction | Transaction[]) => {
    transactions.push(
      ...(Array.isArray(transaction) ? transaction : [transaction])
    );
  },
  tx: { cards: entityTx('cards'), tags: entityTx('tags') },
});

describe('card copy', () => {
  test('copies tags', async () => {
    const transactions: Transaction[] = [];
    const sent: { body: unknown; options?: QueueSendOptions }[] = [];

    const db = createDb({
      cards: [{ logId: 'target-log', order: 2 }],
      transactions,
    });

    const env = {
      JOBS_QUEUE: {
        send: async (body: unknown, options?: QueueSendOptions) => {
          sent.push({ body, options });

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
    } as CloudflareEnv;

    const result = await cardCopy.copyCard({
      cardId: 'card-source',
      dbClient: db as never,
      env,
      input: { logIds: ['target-log'] },
      userId: 'user-1',
    });

    const cardUpdate = transactions.find(
      (transaction) =>
        transaction.entity === 'cards' &&
        transaction.fields?.prompt === 'Track progress'
    );

    const createdTag = transactions.find(
      (transaction) =>
        transaction.entity === 'tags' && transaction.fields?.name === 'Reading'
    );

    expect(result).toMatchObject({
      cards: [{ id: cardUpdate?.id, logId: 'target-log' }],
      queued: true,
      success: true,
    });

    expect(cardUpdate?.fields).toMatchObject({
      isGenerating: true,
      blueprint: {
        chart: { kind: 'data', title: 'Progress trend', type: 'line' },
        metrics: [{ label: 'Average', unit: 'hrs', value: 1 }],
      },
      logId: 'target-log',
      order: 3,
      teamId: 'target-team',
      title: 'Progress',
      type: 'progress',
    });

    expect(createdTag).toMatchObject({
      fields: {
        color: 4,
        name: 'Reading',
        order: 0,
        teamId: 'target-team',
        type: 'record',
      },
      links: { logs: 'target-log', team: 'target-team' },
    });

    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: 'cards',
          id: cardUpdate?.id,
          links: { tags: 'target-ideas' },
        }),
        expect.objectContaining({
          entity: 'cards',
          id: cardUpdate?.id,
          links: { tags: createdTag?.id },
        }),
      ])
    );

    expect(sent[0]?.body).toMatchObject({
      cardId: cardUpdate?.id,
      requestedAt: cardUpdate?.fields?.generationRequestedAt,
      schemaVersion: 1,
      type: 'card.generate',
    });
  });

  test('cleans failed queues', async () => {
    const transactions: Transaction[] = [];
    const sent: { body: unknown; options?: QueueSendOptions }[] = [];

    const db = createDb({
      sourceTags: [{ color: 2, id: 'source-ideas', name: 'Ideas' }],
      tags: [
        {
          id: 'target-a-ideas',
          logs: [{ id: 'target-a' }],
          name: 'ideas',
          order: 0,
          teamId: 'target-team',
          type: 'record',
        },
        {
          id: 'target-b-ideas',
          logs: [{ id: 'target-b' }],
          name: 'ideas',
          order: 0,
          teamId: 'target-team',
          type: 'record',
        },
      ],
      targetLogs: [
        {
          id: 'target-a',
          team: { roles: [{ role: Role.Admin }] },
          teamId: 'target-team',
        },
        {
          id: 'target-b',
          team: { roles: [{ role: Role.Admin }] },
          teamId: 'target-team',
        },
      ],
      transactions,
    });

    const env = {
      JOBS_QUEUE: {
        send: async (body: unknown, options?: QueueSendOptions) => {
          sent.push({ body, options });
          if (sent.length > 1) throw new Error('queue down');

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
    } as CloudflareEnv;

    await expect(
      cardCopy.copyCard({
        cardId: 'card-source',
        dbClient: db as never,
        env,
        input: { logIds: ['target-a', 'target-b'] },
        userId: 'user-1',
      })
    ).rejects.toThrow('queue down');

    const createdCardIds = transactions
      .filter(
        (transaction) =>
          transaction.entity === 'cards' &&
          transaction.fields?.prompt === 'Track progress'
      )
      .map((transaction) => transaction.id);

    const failedCardIds = transactions
      .filter(
        (transaction) =>
          transaction.entity === 'cards' &&
          transaction.fields?.error === 'Failed to generate card.'
      )
      .map((transaction) => transaction.id);

    expect(sent[0]?.body).toMatchObject({ cardId: createdCardIds[0] });
    expect(failedCardIds).toEqual([createdCardIds[1]]);
  });
});
