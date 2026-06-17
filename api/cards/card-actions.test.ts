import * as cardActions from '@/api/cards/card-actions';
import * as cardAnalysis from '@/domain/cards/analysis';
import * as sourceAssembly from '@/domain/cards/source-assembly';
import { Role } from '@/domain/teams/role';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const originalFetch = globalThis.fetch;
const originalOpenRouterCardModel = process.env.OPENROUTER_CARD_MODEL;
const TEST_CARD_MODEL = 'openai/gpt-test-card-model';

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
      model: TEST_CARD_MODEL,
      object: 'chat.completion',
      system_fingerprint: null,
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  );

const readChatRequest = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const request = input instanceof Request ? input : new Request(input, init);

  return JSON.parse(await request.text()) as {
    messages?: { content?: unknown; role?: unknown }[];
  };
};

beforeEach(() => {
  process.env.OPENROUTER_CARD_MODEL = TEST_CARD_MODEL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalOpenRouterCardModel === undefined) {
    Reflect.deleteProperty(process.env, 'OPENROUTER_CARD_MODEL');
  } else {
    process.env.OPENROUTER_CARD_MODEL = originalOpenRouterCardModel;
  }
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

  test('allows refreshers', () => {
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

  test('matches requests', () => {
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
      output: { metrics: [], milestones: [], summary: 'Old output' },
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
        env: {} as unknown as CloudflareEnv,
        requestedAt,
      })
    ).resolves.toEqual({ empty: true, stale: false, success: true });

    expect(updates.at(-1)).toEqual({
      generationRequestedAt: null,
      isGenerating: false,
      lastGeneratedAt: null,
      output: null,
      sourceFingerprint: expect.any(String),
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
        env: { OPENROUTER_API_KEY: 'key' } as unknown as CloudflareEnv,
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
        summary: 'Generated sleep summary.',
      },
      sourceFingerprint: expect.any(String),
      title: 'Copied sleep',
    });
  });

  test('passes siblings', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';

    let requestBody:
      | { messages?: { content?: unknown; role?: unknown }[] }
      | undefined;

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      isGenerating: true,
      logId: 'log-1',
      prompt: 'Track sleep quality',
      tags: [{ id: 'tag-a' }],
      title: 'Sleep quality',
    };

    const siblingCard = {
      id: 'card-2',
      logId: 'log-1',
      order: 2,
      output: {
        metrics: [{ label: 'Average sleep', unit: 'hrs', value: 7 }],
        milestones: [{ title: 'Baseline beat' }],
        summary: 'Weekly average already shown.',
      },
      prompt: 'Track average sleep',
      tags: [{ id: 'tag-a', name: 'sleep' }],
      title: 'Sleep average',
    };

    const overlappingCard = {
      id: 'card-3',
      logId: 'log-1',
      order: 1,
      output: {
        metrics: [{ label: 'Best quality', value: 5 }],
        milestones: [],
      },
      prompt: 'Track sleep quality with mood',
      tags: [
        { id: 'tag-a', name: 'sleep' },
        { id: 'tag-b', name: 'quality' },
      ],
      title: 'Sleep quality',
    };

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: { summary: 'Sleep quality is distinct.' },
        title: 'Sleep quality',
      });
    }) as never;

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
          const cardsQuery = query.cards as {
            $?: { where?: { id?: string; logId?: string } };
          };

          if (cardsQuery.$?.where?.logId === 'log-1') {
            return { cards: [card, overlappingCard, siblingCard] };
          }

          return { cards: [card] };
        }

        if ('records' in query) {
          return {
            records: [
              {
                author: { name: 'Cade' },
                date: '2026-05-20T00:00:00.000Z',
                id: 'record-1',
                tags: [{ id: 'tag-a', name: 'sleep' }],
                text: 'Slept 7 hours and woke rested.',
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
        Object.assign(card, transaction.fields);
      },
      tx: { cards: entityTx('cards') },
    };

    await expect(
      cardActions.generateCard({
        cardId: 'card-1',
        dbClient: db as never,
        env: { OPENROUTER_API_KEY: 'key' } as unknown as CloudflareEnv,
        requestedAt,
      })
    ).resolves.toMatchObject({ success: true });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      existingCards?: { id?: string; sections?: { metrics?: unknown[] } }[];
      records?: { fullTextRecords?: { author?: unknown }[] };
    };

    expect(userPayload.existingCards).toHaveLength(1);

    expect(userPayload.existingCards?.[0]).toMatchObject({
      prompt: 'Track average sleep',
      sections: { metrics: [{ label: 'Average sleep', unit: 'hrs' }] },
      title: 'Sleep average',
    });

    expect(userPayload.existingCards?.[0]?.id).toBeUndefined();
    expect(userPayload.records?.fullTextRecords?.[0]?.author).toBe('Cade');
  });

  test('folds nested sources', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';

    let requestBody:
      | { messages?: { content?: unknown; role?: unknown }[] }
      | undefined;

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      isGenerating: true,
      logId: 'log-1',
      prompt: 'Summarize follow-ups and audio evidence',
      tags: [{ id: 'tag-a' }],
      title: 'Follow-ups',
    };

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: { summary: 'Nested evidence was used.' },
        title: 'Follow-ups',
      });
    }) as never;

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
                author: { name: 'Cade' },
                date: '2026-05-20T10:00:00.000Z',
                files: [
                  {
                    order: 1,
                    transcript: [
                      { end: 6, start: 2, text: 'Parent audio evidence.' },
                    ],
                    type: 'audio',
                  },
                ],
                id: 'record-1',
                logId: 'log-1',
                replies: [
                  {
                    author: { name: 'Mina' },
                    date: '2026-05-20T11:00:00.000Z',
                    files: [
                      {
                        order: 1,
                        transcript: [
                          { end: 10, start: 7, text: 'Reply audio evidence.' },
                        ],
                        type: 'video',
                      },
                    ],
                    id: 'reply-1',
                    isDraft: false,
                    text: 'Published reply detail.',
                  },
                  {
                    author: { name: 'Draft author' },
                    date: '2026-05-20T12:00:00.000Z',
                    id: 'reply-2',
                    isDraft: true,
                    text: 'Draft reply detail.',
                  },
                ],
                tags: [{ id: 'tag-a', name: 'session' }],
                status: 'published',
                text: '',
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
        Object.assign(card, transaction.fields);
      },
      tx: { cards: entityTx('cards') },
    };

    await expect(
      cardActions.generateCard({
        cardId: 'card-1',
        dbClient: db as never,
        env: { OPENROUTER_API_KEY: 'key' } as unknown as CloudflareEnv,
        requestedAt,
      })
    ).resolves.toMatchObject({ success: true });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      card?: { generationTime?: string };
      records?: { fullTextRecords?: { id?: unknown; text?: string }[] };
    };

    const sourceText = userPayload.records?.fullTextRecords?.[0]?.text ?? '';
    expect(userPayload.card?.generationTime).toBe(requestedAt);

    expect(sourceText).toContain(
      '[record | author: Cade | time: 2026-05-20T10:00:00.000Z]'
    );

    expect(sourceText).toContain('Audio transcript:');
    expect(sourceText).toContain('Parent audio evidence.');

    expect(sourceText).toContain(
      '[reply | author: Mina | time: 2026-05-20T11:00:00.000Z]'
    );

    expect(sourceText).toContain('Published reply detail.');
    expect(sourceText).toContain('Video transcript:');
    expect(sourceText).toContain('Reply audio evidence.');
    expect(sourceText).toContain('author: Mina');
    expect(sourceText).toContain('time: 2026-05-20T11:00:00.000Z');
    expect(sourceText).not.toContain('offset:');
    expect(sourceText).not.toContain('Draft reply detail.');
    expect(sourceText).not.toContain('reply-1');
    expect(userPayload.records?.fullTextRecords?.[0]?.id).toBeUndefined();
  });

  test('queues exact chunks', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
              link: (links: Record<string, string>) => ({
                entity,
                fields,
                id,
                links,
              }),
            }),
          }),
        }
      );

    const run = async (recordCount: number, expectedChunkCount: number) => {
      const sent: { body: unknown; options?: QueueSendOptions }[] = [];
      const transactions: { fields?: Record<string, unknown> }[] = [];

      const card = {
        generationRequestedAt: requestedAt,
        id: 'card-1',
        isGenerating: true,
        logId: 'log-1',
        prompt: 'Count whining, barking, pacing, and settling.',
        tags: [{ id: 'tag-a' }],
        teamId: 'team-1',
        title: 'Counts',
      };

      const records = Array.from({ length: recordCount }, (_item, index) => ({
        date: `2026-05-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
        id: `record-${index}`,
        logId: 'log-1',
        status: 'published',
        tags: [{ id: 'tag-a', name: 'Session' }],
        text: `Session ${index}`,
      }));

      globalThis.fetch = mock(async () =>
        jsonResponse({
          mode: 'exact',
          rationale: 'The prompt asks for counts.',
          analysisSpec: {
            aggregations: [
              {
                denominatorId: null,
                eventLabel: 'whining',
                fieldId: 'events',
                id: 'whining_count',
                label: 'Whining',
                numeratorId: null,
                operation: 'count',
                outcomeLabel: null,
                qualitativeLabel: null,
                unit: null,
              },
            ],
            charts: [],
            extractionFields: [
              {
                countMode: 'explicitOccurrences',
                id: 'events',
                label: 'Events',
                labels: ['whining'],
                scoreScale: null,
                type: 'event',
                unit: null,
              },
            ],
            groupings: [],
          },
        })
      ) as never;

      const db = {
        query: async (query: Record<string, unknown>) => {
          if ('cards' in query) return { cards: [card] };
          if ('records' in query) return { records };
          return {};
        },
        transact: async (
          transaction:
            | { fields?: Record<string, unknown> }
            | { fields?: Record<string, unknown> }[]
        ) => {
          transactions.push(
            ...(Array.isArray(transaction) ? transaction : [transaction])
          );
        },
        tx: { analyses: entityTx('analyses'), cards: entityTx('cards') },
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
        OPENROUTER_API_KEY: 'key',
      } as unknown as CloudflareEnv;

      await expect(
        cardActions.generateCard({
          cardId: 'card-1',
          dbClient: db as never,
          env,
          requestedAt,
        })
      ).resolves.toMatchObject({
        analysisMode: 'exact',
        queued: true,
        success: true,
      });

      expect(transactions[0]?.fields).toMatchObject({ jobType: 'generate' });
      expect(sent).toHaveLength(expectedChunkCount);

      expect(sent.map((item) => item.body)).toEqual(
        Array.from({ length: expectedChunkCount }, (_item, chunkIndex) =>
          expect.objectContaining({
            cardId: 'card-1',
            chunkIndex,
            requestedAt,
            schemaVersion: 1,
            type: 'analysis.extract',
          })
        )
      );
    };

    await run(20, 1);
    await run(21, 2);
    await run(40, 2);
    await run(60, 3);
    await run(61, 4);
    await run(300, 15);
  });

  test('queues filtered chunks', async () => {
    const requestedAt = '2026-05-23T12:00:00.000Z';

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
              link: (links: Record<string, string>) => ({
                entity,
                fields,
                id,
                links,
              }),
            }),
          }),
        }
      );

    const run = async (filteredCount: number, expectedChunkCount: number) => {
      const sent: { body: unknown; options?: QueueSendOptions }[] = [];
      const transactions: { fields?: Record<string, unknown> }[] = [];

      const card = {
        generationRequestedAt: requestedAt,
        id: 'card-1',
        isGenerating: true,
        logId: 'log-1',
        prompt: 'Count whining over the last 3 months.',
        tags: [{ id: 'tag-a' }],
        teamId: 'team-1',
        title: 'Counts',
      };

      const oldRecords = Array.from({ length: 12 }, (_item, index) => ({
        date: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        id: `old-${index}`,
        logId: 'log-1',
        status: 'published',
        tags: [{ id: 'tag-a', name: 'Session' }],
        text: `Old session ${index}`,
      }));

      const filteredRecords = Array.from(
        { length: filteredCount },
        (_item, index) => ({
          date: new Date(Date.UTC(2026, 3, 1, 0, index)).toISOString(),
          id: `record-${index}`,
          logId: 'log-1',
          status: 'published',
          tags: [{ id: 'tag-a', name: 'Session' }],
          text: `Session ${index}`,
        })
      );

      globalThis.fetch = mock(async () =>
        jsonResponse({
          mode: 'exact',
          rationale: 'The prompt asks for counts.',
          analysisSpec: {
            aggregations: [
              {
                denominatorId: null,
                eventLabel: 'whining',
                fieldId: 'events',
                id: 'whining_count',
                label: 'Whining',
                numeratorId: null,
                operation: 'count',
                outcomeLabel: null,
                qualitativeLabel: null,
                unit: null,
              },
            ],
            charts: [],
            extractionFields: [
              {
                countMode: 'explicitOccurrences',
                id: 'events',
                label: 'Events',
                labels: ['whining'],
                scoreScale: null,
                type: 'event',
                unit: null,
              },
            ],
            groupings: [],
          },
        })
      ) as never;

      const db = {
        query: async (query: Record<string, unknown>) => {
          if ('cards' in query) return { cards: [card] };

          if ('records' in query) {
            return { records: [...oldRecords, ...filteredRecords] };
          }

          return {};
        },
        transact: async (
          transaction:
            | { fields?: Record<string, unknown> }
            | { fields?: Record<string, unknown> }[]
        ) => {
          transactions.push(
            ...(Array.isArray(transaction) ? transaction : [transaction])
          );
        },
        tx: { analyses: entityTx('analyses'), cards: entityTx('cards') },
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
        OPENROUTER_API_KEY: 'key',
      } as unknown as CloudflareEnv;

      await expect(
        cardActions.generateCard({
          cardId: 'card-1',
          dbClient: db as never,
          env,
          requestedAt,
        })
      ).resolves.toMatchObject({
        analysisMode: 'exact',
        queued: true,
        success: true,
      });

      expect(transactions[0]?.fields?.analysisSpec).toMatchObject({
        filters: [{ id: 'last_3_months', field: 'record.date' }],
      });

      expect(sent).toHaveLength(expectedChunkCount);
    };

    await run(45, 3);
    await run(245, 13);
  });

  test('downgrades exact', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';
    const sent: unknown[] = [];
    let fetchCount = 0;

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      isGenerating: true,
      logId: 'log-1',
      prompt: 'Compare the mood of recent sessions.',
      tags: [{ id: 'tag-a' }],
      teamId: 'team-1',
      title: 'Mood',
    };

    globalThis.fetch = mock(async () => {
      fetchCount += 1;

      return fetchCount === 1
        ? jsonResponse({
            analysisSpec: null,
            mode: 'narrative',
            rationale: 'A prose comparison is enough.',
          })
        : jsonResponse({
            output: { summary: 'Recent sessions felt calmer.' },
            title: 'Mood',
          });
    }) as never;

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
                logId: 'log-1',
                status: 'published',
                tags: [{ id: 'tag-a', name: 'Session' }],
                text: 'Settled calmly.',
              },
            ],
          };
        }

        return {};
      },
      transact: async (transaction: { fields?: Record<string, unknown> }) => {
        Object.assign(card, transaction.fields);
      },
      tx: { cards: entityTx('cards') },
    };

    const env = {
      JOBS_QUEUE: {
        send: async (body: unknown) => {
          sent.push(body);

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
      OPENROUTER_API_KEY: 'key',
    } as unknown as CloudflareEnv;

    await expect(
      cardActions.generateCard({
        cardId: 'card-1',
        dbClient: db as never,
        env,
        requestedAt,
      })
    ).resolves.toMatchObject({ success: true, title: 'Mood' });

    expect(sent).toHaveLength(0);
    expect(fetchCount).toBe(2);
  });

  test('downgrades invalid exact plan', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';
    const sent: unknown[] = [];
    let fetchCount = 0;

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      isGenerating: true,
      logId: 'log-1',
      output: undefined as unknown,
      prompt:
        'Make a line chart over time with Alone duration (min) and Peak distress (0-5). Summarize latest duration and max with distress <=2.',
      tags: [{ id: 'tag-a' }],
      teamId: 'team-1',
      title: 'Separation',
    };

    globalThis.fetch = mock(async () => {
      fetchCount += 1;

      return fetchCount === 1
        ? jsonResponse({
            analysisSpec: null,
            mode: 'exact',
            rationale: 'Exact analysis would need numeric extraction.',
          })
        : jsonResponse({
            output: {
              chart: {
                series: [
                  {
                    data: [{ label: '2026-05-20T00:00:00.000Z', value: 85 }],
                    label: 'Duration',
                    unit: 'min',
                  },
                ],
                type: 'line',
              },
              metrics: [{ label: 'Latest duration', unit: 'min', value: 85 }],
            },
            title: 'Separation',
          });
    }) as never;

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
                logId: 'log-1',
                status: 'published',
                tags: [{ id: 'tag-a', name: 'Session' }],
                text: 'Alone duration (min): 85\nPeak distress (0-5): 2',
              },
            ],
          };
        }

        return {};
      },
      transact: async (transaction: { fields?: Record<string, unknown> }) => {
        Object.assign(card, transaction.fields);
      },
      tx: { cards: entityTx('cards') },
    };

    const env = {
      JOBS_QUEUE: {
        send: async (body: unknown) => {
          sent.push(body);

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
      OPENROUTER_API_KEY: 'key',
    } as unknown as CloudflareEnv;

    await expect(
      cardActions.generateCard({
        cardId: 'card-1',
        dbClient: db as never,
        env,
        requestedAt,
      })
    ).resolves.toMatchObject({ success: true, title: 'Separation' });

    expect(sent).toHaveLength(0);
    expect(fetchCount).toBe(2);

    expect(card.output).toMatchObject({
      chart: { series: [{ label: 'Duration' }], type: 'line' },
      metrics: [{ label: 'Latest duration', unit: 'min', value: 85 }],
    });
  });
});

describe('card deletion', () => {
  test('deletes generating', async () => {
    const transactions: unknown[] = [];

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('cards' in query) {
          return {
            cards: [
              {
                id: 'card-1',
                isGenerating: true,
                logId: 'log-1',
                teamId: 'team-1',
              },
            ],
          };
        }

        if ('logs' in query) {
          return {
            logs: [
              {
                id: 'log-1',
                profiles: [],
                team: { roles: [{ role: Role.Admin, userId: 'user-1' }] },
                teamId: 'team-1',
              },
            ],
          };
        }

        return {};
      },
      transact: async (transaction: unknown) => {
        transactions.push(transaction);
      },
      tx: {
        cards: new Proxy(
          {},
          {
            get: (_target, id: string) => ({
              delete: () => ({ action: 'delete', entity: 'cards', id }),
            }),
          }
        ),
      },
    };

    await expect(
      cardActions.deleteCardForUser({
        cardId: 'card-1',
        dbClient: db as never,
        userId: 'user-1',
      })
    ).resolves.toEqual({ success: true });

    expect(transactions).toEqual([
      { action: 'delete', entity: 'cards', id: 'card-1' },
    ]);
  });
});

describe('analysis jobs', () => {
  test('skips deleted', async () => {
    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('analyses' in query) return { analyses: [] };
        if ('cards' in query) return { cards: [] };
        return {};
      },
    };

    const env = { OPENROUTER_API_KEY: 'key' } as unknown as CloudflareEnv;

    await expect(
      cardActions.extractCardAnalysisChunk({
        analysisId: 'analysis-1',
        cardId: 'card-1',
        chunkIndex: 0,
        dbClient: db as never,
        env,
        requestedAt: '2026-05-20T00:00:00.000Z',
      })
    ).resolves.toEqual({ stale: true, success: false });

    await expect(
      cardActions.finalizeCardAnalysis({
        analysisId: 'analysis-1',
        cardId: 'card-1',
        dbClient: db as never,
        env,
        requestedAt: '2026-05-20T00:00:00.000Z',
      })
    ).resolves.toEqual({ stale: true, success: false });
  });

  test('stores facts', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';

    const analysisSpec = {
      aggregations: [
        {
          eventLabel: 'whining',
          fieldId: 'events',
          id: 'whining_count',
          label: 'Whining',
          operation: 'count',
        },
      ],
      charts: [],
      extractionFields: [
        {
          countMode: 'explicitOccurrences',
          id: 'events',
          label: 'Events',
          labels: ['whining'],
          type: 'event',
        },
      ],
      groupings: [],
    };

    const analysis = { analysisSpec, id: 'analysis-1', jobType: 'generate' };

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      logId: 'log-1',
      prompt: 'Count whining',
      tags: [{ id: 'tag-a' }],
    };

    const records = [
      {
        date: requestedAt,
        id: 'record-1',
        logId: 'log-1',
        status: 'published',
        tags: [{ id: 'tag-a', name: 'Session' }],
        text: 'Whined twice.',
      },
    ];

    const sent: unknown[] = [];

    const transactions: {
      fields?: Record<string, unknown>;
      id?: string;
      links?: Record<string, string>;
    }[] = [];

    const facts: Record<string, unknown>[] = [];

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
              link: (links: Record<string, string>) => ({
                entity,
                fields,
                id,
                links,
              }),
            }),
          }),
        }
      );

    globalThis.fetch = mock(async () =>
      jsonResponse({
        records: [
          {
            events: [
              {
                count: 2,
                evidence: 'Whined twice.',
                fieldId: 'events',
                label: 'whining',
              },
            ],
            evidence: [],
            numericValues: [],
            outcomes: [],
            qualitativeLabels: [],
            recordIndex: 1,
          },
        ],
      })
    ) as never;

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('analyses' in query) return { analyses: [analysis] };
        if ('cards' in query) return { cards: [card] };
        if ('records' in query) return { records };
        if ('facts' in query) return { facts };
        return {};
      },
      transact: async (
        transaction:
          | {
              fields?: Record<string, unknown>;
              id?: string;
              links?: Record<string, string>;
            }
          | {
              fields?: Record<string, unknown>;
              id?: string;
              links?: Record<string, string>;
            }[]
      ) => {
        const next = Array.isArray(transaction) ? transaction : [transaction];
        transactions.push(...next);

        facts.push(
          ...next.flatMap((item) => {
            if (!item.fields || !('data' in item.fields)) return [];

            const keyMatch =
              typeof item.id === 'string'
                ? /^lookup__key__(.+)$/.exec(item.id)
                : null;

            const key = keyMatch ? JSON.parse(keyMatch[1] ?? '""') : undefined;
            return [{ ...item.fields, key }];
          })
        );
      },
      tx: { facts: entityTx('facts') },
    };

    const env = {
      JOBS_QUEUE: {
        send: async (body: unknown) => {
          sent.push(body);

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
      OPENROUTER_API_KEY: 'key',
    } as unknown as CloudflareEnv;

    await expect(
      cardActions.extractCardAnalysisChunk({
        analysisId: 'analysis-1',
        cardId: 'card-1',
        chunkIndex: 0,
        dbClient: db as never,
        env,
        requestedAt,
      })
    ).resolves.toMatchObject({ completedChunkCount: 1, success: true });

    expect(transactions[0]?.fields).toMatchObject({
      data: expect.objectContaining({ recordId: 'record-1' }),
    });

    expect(transactions[0]?.fields).not.toHaveProperty('key');
    expect(transactions[0]?.fields).not.toHaveProperty('facts');

    expect(transactions[0]?.links).toEqual({
      card: 'card-1',
      record: 'record-1',
    });

    expect(sent).toEqual([
      expect.objectContaining({
        analysisId: 'analysis-1',
        cardId: 'card-1',
        type: 'analysis.finalize',
      }),
    ]);
  });

  test('extracts filtered records', async () => {
    const requestedAt = '2026-05-23T12:00:00.000Z';

    const analysisSpec = {
      aggregations: [
        {
          eventLabel: 'whining',
          fieldId: 'events',
          id: 'whining_count',
          label: 'Whining',
          operation: 'count',
        },
      ],
      charts: [],
      extractionFields: [
        {
          countMode: 'explicitOccurrences',
          id: 'events',
          label: 'Events',
          labels: ['whining'],
          type: 'event',
        },
      ],
      filters: [
        {
          endExclusive: { type: 'generationTime' },
          field: 'record.date',
          id: 'last_3_months',
          startInclusive: {
            offset: { amount: -3, unit: 'month' },
            type: 'generationTime',
          },
        },
      ],
      groupings: [],
    } satisfies cardAnalysis.CardAnalysisSpec;

    const analysis = { analysisSpec, id: 'analysis-1', jobType: 'generate' };

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      logId: 'log-1',
      prompt: 'Count whining over the last 3 months.',
      tags: [{ id: 'tag-a' }],
    };

    const records = [
      {
        date: '2026-01-01T00:00:00.000Z',
        id: 'old-record',
        logId: 'log-1',
        status: 'published',
        tags: [{ id: 'tag-a', name: 'Session' }],
        text: 'Old whining.',
      },
      {
        date: '2026-04-01T00:00:00.000Z',
        id: 'new-record',
        logId: 'log-1',
        status: 'published',
        tags: [{ id: 'tag-a', name: 'Session' }],
        text: 'Whined twice.',
      },
      {
        date: 'not-a-date',
        id: 'invalid-record',
        logId: 'log-1',
        status: 'published',
        tags: [{ id: 'tag-a', name: 'Session' }],
        text: 'Invalid date whining.',
      },
    ];

    const facts: Record<string, unknown>[] = [];
    const sent: unknown[] = [];

    let extractionPayload:
      | { records?: { date?: string | null; recordIndex?: number }[] }
      | undefined;

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
              link: (links: Record<string, string>) => ({
                entity,
                fields,
                id,
                links,
              }),
            }),
          }),
        }
      );

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      const request = await readChatRequest(input, init);

      const userMessage = request.messages?.find(
        (message) => message.role === 'user'
      );

      extractionPayload = JSON.parse(String(userMessage?.content));

      return jsonResponse({
        records: [
          {
            events: [
              {
                count: 2,
                evidence: 'Whined twice.',
                fieldId: 'events',
                label: 'whining',
              },
            ],
            evidence: [],
            numericValues: [],
            outcomes: [],
            qualitativeLabels: [],
            recordIndex: 1,
          },
        ],
      });
    }) as never;

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('analyses' in query) return { analyses: [analysis] };
        if ('cards' in query) return { cards: [card] };
        if ('records' in query) return { records };
        if ('facts' in query) return { facts };
        return {};
      },
      transact: async (
        transaction:
          | {
              fields?: Record<string, unknown>;
              id?: string;
              links?: Record<string, string>;
            }
          | {
              fields?: Record<string, unknown>;
              id?: string;
              links?: Record<string, string>;
            }[]
      ) => {
        const next = Array.isArray(transaction) ? transaction : [transaction];

        facts.push(
          ...next.flatMap((item) => {
            if (!item.fields || !('data' in item.fields)) return [];

            const keyMatch =
              typeof item.id === 'string'
                ? /^lookup__key__(.+)$/.exec(item.id)
                : null;

            const key = keyMatch ? JSON.parse(keyMatch[1] ?? '""') : undefined;
            return [{ ...item.fields, key }];
          })
        );
      },
      tx: { facts: entityTx('facts') },
    };

    const env = {
      JOBS_QUEUE: {
        send: async (body: unknown) => {
          sent.push(body);

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
      OPENROUTER_API_KEY: 'key',
    } as unknown as CloudflareEnv;

    await expect(
      cardActions.extractCardAnalysisChunk({
        analysisId: 'analysis-1',
        cardId: 'card-1',
        chunkIndex: 0,
        dbClient: db as never,
        env,
        requestedAt,
      })
    ).resolves.toMatchObject({ completedChunkCount: 1, success: true });

    expect(extractionPayload?.records?.map((record) => record.date)).toEqual([
      '2026-04-01T00:00:00.000Z',
    ]);

    expect(facts).toHaveLength(1);

    expect(sent).toEqual([
      expect.objectContaining({
        analysisId: 'analysis-1',
        cardId: 'card-1',
        type: 'analysis.finalize',
      }),
    ]);
  });

  test('cleans completed analysis', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';

    const analysisSpec = {
      aggregations: [
        {
          eventLabel: 'whining',
          fieldId: 'events',
          id: 'whining_count',
          label: 'Whining',
          operation: 'count',
        },
      ],
      charts: [],
      extractionFields: [
        {
          countMode: 'explicitOccurrences',
          id: 'events',
          label: 'Events',
          labels: ['whining'],
          type: 'event',
        },
      ],
      groupings: [],
    } satisfies cardAnalysis.CardAnalysisSpec;

    const record = {
      date: requestedAt,
      id: 'record-1',
      logId: 'log-1',
      status: 'published',
      tags: [{ id: 'tag-a', name: 'Session' }],
      text: 'Whined twice.',
    };

    const analysisSpecHash = cardAnalysis.analysisSpecHash(analysisSpec);
    const assembledRecord = sourceAssembly.assembleCardLlmRecord(record)!;

    const factKey = cardAnalysis.factKey({
      analysisSpecHash,
      cardId: 'card-1',
      recordFingerprint: cardAnalysis.recordFingerprint({
        record: assembledRecord,
        selectedTagIds: ['tag-a'],
      }),
      recordId: record.id,
    });

    const factData = {
      events: [
        {
          count: 2,
          evidence: 'Whined twice.',
          fieldId: 'events',
          label: 'whining',
        },
      ],
      evidence: [],
      numericValues: [],
      outcomes: [],
      qualitativeLabels: [],
      recordId: record.id,
    };

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      logId: 'log-1',
      prompt: 'Count whining',
      tags: [{ id: 'tag-a' }],
      title: 'Whining',
    };

    const transactions: {
      action?: string;
      entity: string;
      fields?: Record<string, unknown>;
      id: string;
      links?: Record<string, string>;
    }[] = [];

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            delete: () => ({ action: 'delete', entity, id }),
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
              link: (links: Record<string, string>) => ({
                entity,
                fields,
                id,
                links,
              }),
            }),
          }),
        }
      );

    globalThis.fetch = mock(async () =>
      jsonResponse({
        output: { summary: 'Whining happened twice.' },
        title: 'Whining',
      })
    ) as never;

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('analyses' in query) {
          return {
            analyses: [
              { analysisSpec, id: 'analysis-current', jobType: 'generate' },
            ],
          };
        }

        if ('facts' in query) {
          return {
            facts: [
              { data: factData, id: 'fact-current', key: factKey },
              { data: { recordId: record.id }, id: 'fact-stale', key: 'stale' },
            ],
          };
        }

        if ('records' in query) return { records: [record] };

        if ('cards' in query) {
          const cardsQuery = query.cards as Record<string, unknown>;

          if ('analyses' in cardsQuery || 'facts' in cardsQuery) {
            return {
              cards: [
                {
                  analyses: [
                    { id: 'analysis-current' },
                    { id: 'analysis-stale' },
                  ],
                  facts: [
                    { id: 'fact-current', key: factKey },
                    { id: 'fact-stale', key: 'stale' },
                  ],
                  id: 'card-1',
                },
              ],
            };
          }

          return { cards: [card] };
        }

        return {};
      },
      transact: async (
        transaction:
          | {
              action?: string;
              entity: string;
              fields?: Record<string, unknown>;
              id: string;
              links?: Record<string, string>;
            }
          | {
              action?: string;
              entity: string;
              fields?: Record<string, unknown>;
              id: string;
              links?: Record<string, string>;
            }[]
      ) => {
        const next = Array.isArray(transaction) ? transaction : [transaction];
        transactions.push(...next);

        for (const item of next) {
          if (item.entity === 'cards' && item.fields) {
            Object.assign(card, item.fields);
          }
        }
      },
      tx: {
        analyses: entityTx('analyses'),
        cards: entityTx('cards'),
        facts: entityTx('facts'),
      },
    };

    await expect(
      cardActions.finalizeCardAnalysis({
        analysisId: 'analysis-current',
        cardId: 'card-1',
        dbClient: db as never,
        env: { OPENROUTER_API_KEY: 'key' } as unknown as CloudflareEnv,
        requestedAt,
      })
    ).resolves.toMatchObject({ success: true });

    expect(transactions).toContainEqual({
      action: 'delete',
      entity: 'analyses',
      id: 'analysis-stale',
    });

    expect(transactions).toContainEqual({
      action: 'delete',
      entity: 'facts',
      id: 'fact-stale',
    });

    expect(transactions).not.toContainEqual({
      action: 'delete',
      entity: 'analyses',
      id: 'analysis-current',
    });

    expect(transactions).not.toContainEqual({
      action: 'delete',
      entity: 'facts',
      id: 'fact-current',
    });
  });

  test('finalizes filtered exact facts', async () => {
    const requestedAt = '2026-05-23T12:00:00.000Z';

    const analysisSpec = {
      aggregations: [
        { id: 'record_count', label: 'Records', operation: 'count' },
      ],
      charts: [],
      extractionFields: [],
      filters: [
        {
          endExclusive: { type: 'generationTime' },
          field: 'record.date',
          id: 'last_3_months',
          startInclusive: {
            offset: { amount: -3, unit: 'month' },
            type: 'generationTime',
          },
        },
      ],
      groupings: [],
    } satisfies cardAnalysis.CardAnalysisSpec;

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      logId: 'log-1',
      prompt: 'Count records over the last 3 months.',
      tags: [{ id: 'tag-a' }],
      title: 'Records',
    };

    const oldRecords = Array.from({ length: 10 }, (_item, index) => ({
      date: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      id: `old-${index}`,
      logId: 'log-1',
      status: 'published',
      tags: [{ id: 'tag-a', name: 'Session' }],
      text: `Old session ${index}`,
    }));

    const filteredRecords = Array.from({ length: 245 }, (_item, index) => ({
      date: new Date(Date.UTC(2026, 3, 1, 0, index)).toISOString(),
      id: `record-${index}`,
      logId: 'log-1',
      status: 'published',
      tags: [{ id: 'tag-a', name: 'Session' }],
      text: `Session ${index}`,
    }));

    const records = [...oldRecords, ...filteredRecords];
    const assembledRecords = sourceAssembly.assembleCardLlmRecords(records);

    const assembledRecordsById = new Map(
      assembledRecords.map((record) => [record.id, record])
    );

    const analysisSpecHash = cardAnalysis.analysisSpecHash(analysisSpec);

    const facts = filteredRecords.map((record, index) => ({
      data: {
        events: [],
        evidence: [],
        numericValues: [],
        outcomes: [],
        qualitativeLabels: [],
        recordId: record.id,
      },
      id: `fact-${index}`,
      key: cardAnalysis.factKey({
        analysisSpecHash,
        cardId: card.id,
        recordFingerprint: cardAnalysis.recordFingerprint({
          record: assembledRecordsById.get(record.id)!,
          selectedTagIds: ['tag-a'],
        }),
        recordId: record.id,
      }),
    }));

    const transactions: { fields?: Record<string, unknown> }[] = [];

    let generationPayload:
      | {
          exactFacts?: {
            aggregateValues?: Record<string, { value?: number }>;
            totalMatchingRecordCount?: number;
          };
          records?: {
            selectedRecordCount?: number;
            totalMatchingRecordCount?: number;
          };
        }
      | undefined;

    const entityTx = (entity: string) =>
      new Proxy(
        {},
        {
          get: (_target, id: string) => ({
            delete: () => ({ action: 'delete', entity, id }),
            update: (fields: Record<string, unknown>) => ({
              entity,
              fields,
              id,
            }),
          }),
        }
      );

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      const request = await readChatRequest(input, init);

      const userMessage = request.messages?.find(
        (message) => message.role === 'user'
      );

      generationPayload = JSON.parse(String(userMessage?.content));

      return jsonResponse({
        output: { metrics: [{ label: 'Records', value: '245' }] },
        title: 'Records',
      });
    }) as never;

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('analyses' in query) {
          return {
            analyses: [
              { analysisSpec, id: 'analysis-current', jobType: 'generate' },
            ],
          };
        }

        if ('facts' in query) return { facts };
        if ('records' in query) return { records };

        if ('cards' in query) {
          const cardsQuery = query.cards as Record<string, unknown>;

          if ('analyses' in cardsQuery || 'facts' in cardsQuery) {
            return {
              cards: [
                {
                  analyses: [{ id: 'analysis-current' }],
                  facts: facts.map((fact) => ({ id: fact.id, key: fact.key })),
                  id: card.id,
                },
              ],
            };
          }

          return { cards: [card] };
        }

        return {};
      },
      transact: async (
        transaction:
          | { fields?: Record<string, unknown> }
          | { fields?: Record<string, unknown> }[]
      ) => {
        transactions.push(
          ...(Array.isArray(transaction) ? transaction : [transaction])
        );
      },
      tx: {
        analyses: entityTx('analyses'),
        cards: entityTx('cards'),
        facts: entityTx('facts'),
      },
    };

    await expect(
      cardActions.finalizeCardAnalysis({
        analysisId: 'analysis-current',
        cardId: card.id,
        dbClient: db as never,
        env: { OPENROUTER_API_KEY: 'key' } as unknown as CloudflareEnv,
        requestedAt,
      })
    ).resolves.toMatchObject({ success: true });

    expect(generationPayload?.records).toMatchObject({
      selectedRecordCount: 240,
      totalMatchingRecordCount: 245,
    });

    expect(generationPayload?.exactFacts).toMatchObject({
      aggregateValues: { record_count: { value: 245 } },
      totalMatchingRecordCount: 245,
    });

    expect(transactions.some((item) => item.fields?.output)).toBe(true);
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
      output: { metrics: [], milestones: [], summary: 'Sleep is steady.' },
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
        env: { OPENROUTER_API_KEY: 'key' } as unknown as CloudflareEnv,
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
        summary: 'Weekly sleep improved.',
      },
      title: 'Weekly sleep',
    });

    expect(updates.at(-1)).not.toHaveProperty('prompt');
  });
});

describe('card refresh queue', () => {
  test('queues manual', async () => {
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
    } as unknown as CloudflareEnv;

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

  test('skips unchanged manual', async () => {
    const sent: unknown[] = [];
    const updates: Record<string, unknown>[] = [];
    const generationTime = new Date().toISOString();

    const record = {
      date: '2026-05-20T00:00:00.000Z',
      id: 'record-1',
      logId: 'log-1',
      status: 'published',
      tags: [{ id: 'tag-a', name: 'Session' }],
      text: 'Ran 3 miles.',
    };

    const sourceFingerprint = cardAnalysis.cardSourceFingerprint({
      generationTime,
      prompt: 'Progress',
      records: [sourceAssembly.assembleCardLlmRecord(record)!],
      selectedTagIds: ['tag-a'],
    });

    const card = {
      id: 'card-1',
      logId: 'log-1',
      output: { summary: 'Current progress.' },
      prompt: 'Progress',
      sourceFingerprint,
      tags: [{ id: 'tag-a' }],
      teamId: 'team-1',
      title: 'Progress',
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

        if ('records' in query) return { records: [record] };
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
        send: async (body: unknown) => {
          sent.push(body);

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
    } as unknown as CloudflareEnv;

    await expect(
      cardActions.refreshCardForUser({
        cardId: 'card-1',
        dbClient: db as never,
        env,
        userId: 'user-1',
      })
    ).resolves.toEqual({ queued: false, skipped: true, success: true });

    expect(sent).toEqual([]);
    expect(updates).toEqual([]);
  });

  test('skips unchanged job', async () => {
    const requestedAt = '2026-05-20T00:00:00.000Z';
    const updates: Record<string, unknown>[] = [];

    const record = {
      date: '2026-05-19T00:00:00.000Z',
      id: 'record-1',
      logId: 'log-1',
      status: 'published',
      tags: [{ id: 'tag-a', name: 'Session' }],
      text: 'Ran 3 miles.',
    };

    const card = {
      generationRequestedAt: requestedAt,
      id: 'card-1',
      logId: 'log-1',
      output: { summary: 'Current progress.' },
      prompt: 'Progress',
      sourceFingerprint: cardAnalysis.cardSourceFingerprint({
        generationTime: requestedAt,
        prompt: 'Progress',
        records: [sourceAssembly.assembleCardLlmRecord(record)!],
        selectedTagIds: ['tag-a'],
      }),
      tags: [{ id: 'tag-a' }],
      teamId: 'team-1',
      title: 'Progress',
    };

    globalThis.fetch = mock(async () => {
      throw new Error('unexpected refresh');
    }) as never;

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
        if ('records' in query) return { records: [record] };
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
      cardActions.refreshCard({
        cardId: 'card-1',
        dbClient: db as never,
        env: { OPENROUTER_API_KEY: 'key' } as unknown as CloudflareEnv,
        requestedAt,
      })
    ).resolves.toEqual({ skipped: true, stale: false, success: true });

    expect(updates).toEqual([
      { error: '', generationRequestedAt: null, isGenerating: false },
    ]);
  });

  test('queues records', async () => {
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
    } as unknown as CloudflareEnv;

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

  test('queues file transcript records', async () => {
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
        if ('files' in query) {
          return {
            files: [
              {
                id: 'file-1',
                reply: {
                  id: 'reply-1',
                  isDraft: false,
                  record: {
                    id: 'record-1',
                    logId: 'log-1',
                    status: 'published',
                    tags: [{ id: 'tag-a' }],
                  },
                },
              },
            ],
          };
        }

        if ('cards' in query) {
          return {
            cards: [
              { id: 'card-1', tags: [{ id: 'tag-a' }], teamId: 'team-1' },
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
    } as unknown as CloudflareEnv;

    await cardActions.queuePublishedFileCardRefreshes({
      dbClient: db as never,
      env,
      fileId: 'file-1',
    });

    expect(cardUpdates).toHaveLength(1);

    expect(sent[0]?.body).toMatchObject({
      cardId: 'card-1',
      requestedAt: cardUpdates[0]?.generationRequestedAt,
      schemaVersion: 1,
      type: 'card.refresh',
    });
  });

  test('skips draft file transcripts', async () => {
    const sent: unknown[] = [];

    const db = {
      query: async (query: Record<string, unknown>) => {
        if ('files' in query) {
          return {
            files: [
              {
                id: 'file-1',
                reply: {
                  id: 'reply-1',
                  isDraft: true,
                  record: {
                    id: 'record-1',
                    logId: 'log-1',
                    status: 'published',
                    tags: [{ id: 'tag-a' }],
                  },
                },
              },
            ],
          };
        }

        if ('cards' in query) return { cards: [] };
        return {};
      },
      transact: async () => undefined,
      tx: { cards: {} },
    };

    const env = {
      JOBS_QUEUE: {
        send: async (body: unknown) => {
          sent.push(body);

          return {
            metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
          };
        },
      } as Queue,
    } as unknown as CloudflareEnv;

    await cardActions.queuePublishedFileCardRefreshes({
      dbClient: db as never,
      env,
      fileId: 'file-1',
    });

    expect(sent).toEqual([]);
  });

  test('keeps best effort', async () => {
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

describe('record refresh', () => {
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
              log: {
                team: {
                  roles: actorRole
                    ? [{ role: actorRole, userId: 'user-1' }]
                    : [],
                },
              },
              status: 'published',
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

  test('propagates failures', async () => {
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
