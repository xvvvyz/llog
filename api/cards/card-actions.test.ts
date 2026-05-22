import * as cardActions from '@/api/cards/card-actions';
import { Role } from '@/domain/teams/role';
import { afterEach, describe, expect, mock, test } from 'bun:test';

const originalFetch = globalThis.fetch;

const jsonResponse = (content: unknown) =>
  new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: 'stop',
          index: 0,
          message: { content: JSON.stringify(content), role: 'assistant' },
        },
      ],
      created: 1,
      id: 'chatcmpl-test',
      model: 'openai/gpt-5.5',
      object: 'chat.completion',
      system_fingerprint: null,
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  );

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('card permissions', () => {
  test('allows managers', () => {
    expect(cardActions.canManageCards({ actorRole: Role.Owner })).toBe(true);
    expect(cardActions.canManageCards({ actorRole: Role.Admin })).toBe(true);
  });

  test('denies members', () => {
    expect(cardActions.canManageCards({ actorRole: Role.Member })).toBe(false);
    expect(cardActions.canManageCards({ actorRole: null })).toBe(false);
  });

  test('views log members', () => {
    expect(
      cardActions.canViewCards({ actorRole: Role.Member, isLogMember: true })
    ).toBe(true);

    expect(
      cardActions.canViewCards({ actorRole: Role.Member, isLogMember: false })
    ).toBe(false);
  });

  test('allows authors and managers', () => {
    expect(
      cardActions.canRefreshRecordCards({
        actorRole: Role.Member,
        isAuthor: true,
      })
    ).toBe(true);

    expect(
      cardActions.canRefreshRecordCards({
        actorRole: Role.Admin,
        isAuthor: false,
      })
    ).toBe(true);

    expect(
      cardActions.canRefreshRecordCards({
        actorRole: Role.Member,
        isAuthor: false,
      })
    ).toBe(false);

    expect(
      cardActions.canRefreshRecordCards({ actorRole: null, isAuthor: true })
    ).toBe(false);
  });

  test('matches generation requests', () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';

    expect(
      cardActions.isSameGenerationRequest({
        generationRequestedAt: requestedAt,
        requestedAt,
      })
    ).toBe(true);

    expect(
      cardActions.isSameGenerationRequest({
        generationRequestedAt: '2026-05-20T00:00:01.000Z',
        requestedAt,
      })
    ).toBe(false);
  });
});

describe('card generation', () => {
  test('clears empty output', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';
    const updates: Record<string, unknown>[] = [];

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      isGenerating: true,
      logId: 'log-1',
      output: {
        metrics: [],
        milestones: [],
        sourceRecordIds: [],
        summary: 'Old output',
      },
      prompt: 'Track sleep',
      tags: [{ id: 'tag-a' }],
      title: 'Sleep',
    };

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
            }),
          }),
        }
      );

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('cards' in query) return { cards: [card] };
        if ('records' in query) return { records: [] };
        return {};
      },
      transact: async (transaction: {
        entity: string;
        fields: Record<string, unknown>;
        id: string;
      }) => {
        updates.push(transaction.fields);
        Object.assign(card, transaction.fields);
      },
      tx: { cards: entityTx('cards') },
    };

    await expect(
      cardActions.generateCard({
        cardId: 'card-1',
        dbClient: db as never,
        env: {} as CloudflareEnv,
        requestedAt,
      })
    ).resolves.toEqual({ empty: true, stale: false, success: true });

    expect(updates.at(-1)).toEqual({
      generationRequestedAt: null,
      isGenerating: false,
      lastGeneratedAt: null,
      output: null,
      title: 'Track sleep',
    });
  });

  test('keeps copied title', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';
    const updates: Record<string, unknown>[] = [];

    const card = {
      blueprint: { summary: true },
      generationRequestedAt: requestedAt,
      id: 'card-1',
      isGenerating: true,
      logId: 'log-1',
      prompt: 'Track sleep',
      tags: [{ id: 'tag-a' }],
      title: 'Copied sleep',
    };

    globalThis.fetch = mock(async () =>
      jsonResponse({
        output: { summary: 'Generated sleep summary.' },
        title: 'Generated sleep',
      })
    ) as never;

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
            }),
          }),
        }
      );

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('cards' in query) return { cards: [card] };

        if ('records' in query) {
          return {
            records: [
              {
                date: '2026-05-20T00:00:00.000Z',
                id: 'record-1',
                tags: [{ name: 'sleep' }],
                text: 'Slept well',
              },
            ],
          };
        }

        return {};
      },
      transact: async (transaction: {
        entity: string;
        fields: Record<string, unknown>;
        id: string;
      }) => {
        updates.push(transaction.fields);
        Object.assign(card, transaction.fields);
      },
      tx: { cards: entityTx('cards') },
    };

    await expect(
      cardActions.generateCard({
        cardId: 'card-1',
        dbClient: db as never,
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        requestedAt,
      })
    ).resolves.toMatchObject({ success: true, title: 'Copied sleep' });

    expect(updates.at(-1)).toMatchObject({
      blueprint: null,
      generationRequestedAt: null,
      isGenerating: false,
      output: {
        metrics: [],
        milestones: [],
        sourceRecordIds: [],
        summary: 'Generated sleep summary.',
      },
      title: 'Copied sleep',
    });
  });
});

describe('card tweak', () => {
  test('writes title', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';
    const updates: Record<string, unknown>[] = [];

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      isGenerating: true,
      logId: 'log-1',
      output: {
        metrics: [],
        milestones: [],
        sourceRecordIds: [],
        summary: 'Sleep is steady.',
      },
      prompt: 'Track sleep',
      tags: [{ id: 'tag-a' }],
      title: 'Sleep',
    };

    globalThis.fetch = mock(async () =>
      jsonResponse({
        output: { summary: 'Weekly sleep improved.' },
        title: 'Weekly sleep',
      })
    ) as never;

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
            }),
          }),
        }
      );

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('cards' in query) return { cards: [card] };

        if ('records' in query) {
          return {
            records: [
              {
                date: '2026-05-20T00:00:00.000Z',
                id: 'record-1',
                tags: [{ name: 'sleep' }],
                text: 'Slept well',
              },
            ],
          };
        }

        return {};
      },
      transact: async (transaction: {
        entity: string;
        fields: Record<string, unknown>;
        id: string;
      }) => {
        updates.push(transaction.fields);
        Object.assign(card, transaction.fields);
      },
      tx: { cards: entityTx('cards') },
    };

    await expect(
      cardActions.tweakCard({
        cardId: 'card-1',
        dbClient: db as never,
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        requestedAt,
        tweakPrompt: 'Make it weekly',
      })
    ).resolves.toMatchObject({
      prompt: 'Track sleep',
      success: true,
      title: 'Weekly sleep',
    });

    expect(updates.at(-1)).toMatchObject({
      generationRequestedAt: null,
      isGenerating: false,
      output: {
        metrics: [],
        milestones: [],
        sourceRecordIds: [],
        summary: 'Weekly sleep improved.',
      },
      title: 'Weekly sleep',
    });

    expect(updates.at(-1)).not.toHaveProperty('prompt');
  });
});

describe('card refresh queue', () => {
  test('queues manual refresh', async () => {
    const sent: { body: unknown; options?: QueueSendOptions }[] = [];
    const updates: Record<string, unknown>[] = [];

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
            }),
          }),
        }
      );

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('cards' in query) {
          return {
            cards: [
              {
                id: 'card-1',
                logId: 'log-1',
                prompt: 'Progress',
                teamId: 'team-1',
                title: 'Progress',
              },
            ],
          };
        }

        if ('logs' in query) {
          return {
            logs: [
              {
                id: 'log-1',
                team: { roles: [{ role: Role.Owner, userId: 'user-1' }] },
                teamId: 'team-1',
              },
            ],
          };
        }

        return {};
      },
      transact: async (transaction: {
        entity: string;
        fields: Record<string, unknown>;
        id: string;
      }) => {
        updates.push(transaction.fields);
      },
      tx: { cards: entityTx('cards') },
    };

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

    await expect(
      cardActions.refreshCardForUser({
        cardId: 'card-1',
        dbClient: db as never,
        env,
        userId: 'user-1',
      })
    ).resolves.toEqual({ queued: true, success: true });

    expect(updates[0]).toMatchObject({ error: '', isGenerating: true });

    expect(sent[0]?.body).toMatchObject({
      cardId: 'card-1',
      requestedAt: updates[0]?.generationRequestedAt,
      schemaVersion: 1,
      type: 'card.refresh',
    });
  });

  test('queues record refreshes', async () => {
    const cardUpdates: Record<string, unknown>[] = [];
    const sent: { body: unknown; options?: QueueSendOptions }[] = [];

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
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

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('cards' in query) {
          return {
            cards: [
              {
                id: 'card-1',
                tags: [{ id: 'tag-a' }, { id: 'tag-b' }],
                teamId: 'team-1',
              },
              { id: 'card-2', tags: [{ id: 'tag-c' }], teamId: 'team-1' },
            ],
          };
        }

        return {};
      },
      transact: async (
        transactions:
          | { entity: string; fields: Record<string, unknown>; id: string }
          | { entity: string; fields: Record<string, unknown>; id: string }[]
      ) => {
        for (const transaction of Array.isArray(transactions)
          ? transactions
          : [transactions]) {
          if (transaction.entity === 'cards') {
            cardUpdates.push(transaction.fields);
          }
        }
      },
      tx: { cards: entityTx('cards') },
    };

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

    await cardActions.refreshPublishedRecordCards({
      dbClient: db as never,
      debounceMs: 10_000,
      env,
      logId: 'log-1',
      recordTagIds: ['tag-a'],
    });

    expect(sent).toHaveLength(1);
    expect(cardUpdates).toHaveLength(1);

    expect(cardUpdates.every((update) => update.isGenerating === true)).toBe(
      true
    );

    expect(sent[0]?.body).toMatchObject({
      cardId: 'card-1',
      requestedAt: cardUpdates[0]?.generationRequestedAt,
      schemaVersion: 1,
      type: 'card.refresh',
    });

    expect(sent[0]?.options?.delaySeconds).toBe(10);
  });

  test('keeps enqueue best effort', async () => {
    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
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

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('cards' in query) {
          return {
            cards: [
              { id: 'card-1', tags: [{ id: 'tag-a' }], teamId: 'team-1' },
            ],
          };
        }

        return {};
      },
      transact: async () => undefined,
      tx: { cards: entityTx('cards') },
    };

    const env = {
      JOBS_QUEUE: { send: async () => Promise.reject(new Error('queue down')) },
    } as unknown as CloudflareEnv;

    const originalConsoleError = console.error;
    const consoleError = mock(() => {});
    console.error = consoleError;

    try {
      await expect(
        cardActions.queuePublishedRecordCardRefreshes({
          dbClient: db as never,
          env,
          logId: 'log-1',
          recordTagIds: ['tag-a'],
        })
      ).resolves.toBeUndefined();

      expect(consoleError).toHaveBeenCalledTimes(1);
    } finally {
      console.error = originalConsoleError;
    }
  });
});

describe('record card refreshes', () => {
  const entityTx = (entity: string) =>
    new Proxy(
      {},
      {
        get: (_target, id: string) => ({
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

  const createDb = ({
    actorRole = Role.Member,
    cards = [],
    tags = [
      {
        id: 'tag-a',
        logs: [{ id: 'log-1' }],
        teamId: 'team-1',
        type: 'record',
      },
    ],
  }: {
    actorRole?: string | null;
    cards?: {
      id: string;
      logId?: string;
      prompt?: string;
      tags?: { id: string }[];
      teamId?: string;
      title?: string;
    }[];
    tags?: {
      id: string;
      logs?: { id: string }[];
      teamId?: string;
      type?: string;
    }[];
  } = {}) => ({
    query: async (query: Record<string, unknown>) => {
      if ('records' in query) {
        return {
          records: [
            {
              author: { user: { id: 'user-1' } },
              id: 'record-1',
              isDraft: false,
              log: {
                team: {
                  roles: actorRole
                    ? [{ role: actorRole, userId: 'user-1' }]
                    : [],
                },
              },
              logId: 'log-1',
              teamId: 'team-1',
            },
          ],
        };
      }

      if ('tags' in query) return { tags };
      if ('cards' in query) return { cards };
      return {};
    },
    transact: async () => undefined,
    tx: { cards: entityTx('cards') },
  });

  const env = {
    JOBS_QUEUE: {
      send: async () => ({
        metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
      }),
    } as unknown as Queue,
  } as unknown as CloudflareEnv;

  test('rejects invalid tags', async () => {
    await expect(
      cardActions.refreshRecordCardsForUser({
        dbClient: createDb({ tags: [] }) as never,
        env,
        input: { recordId: 'record-1', tagIds: ['tag-a'] },
        userId: 'user-1',
      })
    ).rejects.toThrow('Invalid source tags');
  });

  test('denies stale authors', async () => {
    await expect(
      cardActions.refreshRecordCardsForUser({
        dbClient: createDb({ actorRole: null }) as never,
        env,
        input: { recordId: 'record-1', tagIds: ['tag-a'] },
        userId: 'user-1',
      })
    ).rejects.toThrow('Forbidden');
  });

  test('refreshes valid tags', async () => {
    await expect(
      cardActions.refreshRecordCardsForUser({
        dbClient: createDb() as never,
        env,
        input: { recordId: 'record-1', tagIds: ['tag-a'] },
        userId: 'user-1',
      })
    ).resolves.toEqual({ success: true });
  });

  test('propagates enqueue failures', async () => {
    const failingEnv = {
      JOBS_QUEUE: { send: async () => Promise.reject(new Error('queue down')) },
    } as unknown as CloudflareEnv;

    await expect(
      cardActions.refreshRecordCardsForUser({
        dbClient: createDb({
          cards: [
            {
              id: 'card-1',
              logId: 'log-1',
              prompt: 'Progress',
              tags: [{ id: 'tag-a' }],
              teamId: 'team-1',
              title: 'Progress',
            },
          ],
        }) as never,
        env: failingEnv,
        input: { recordId: 'record-1', tagIds: ['tag-a'] },
        userId: 'user-1',
      })
    ).rejects.toThrow('queue down');
  });
});
