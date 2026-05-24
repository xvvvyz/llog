import * as openrouter from '@/api/cards/openrouter';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const originalFetch = globalThis.fetch;
const originalOpenRouterCardModel = process.env.OPENROUTER_CARD_MODEL;
const TEST_OPENROUTER_CARD_MODEL = 'openai/gpt-test-card-model';

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
      model: TEST_OPENROUTER_CARD_MODEL,
      object: 'chat.completion',
      system_fingerprint: null,
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  );

const malformedJsonResponse = (content = '{') =>
  new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: 'stop',
          index: 0,
          message: { content, role: 'assistant' },
        },
      ],
      created: 1,
      id: 'chatcmpl-test',
      model: TEST_OPENROUTER_CARD_MODEL,
      object: 'chat.completion',
      system_fingerprint: null,
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  );

const refusalResponse = (refusal: string) =>
  new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: 'stop',
          index: 0,
          message: { content: null, refusal, role: 'assistant' },
        },
      ],
      created: 1,
      id: 'chatcmpl-test',
      model: TEST_OPENROUTER_CARD_MODEL,
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
  return JSON.parse(await request.text()) as ChatCompletionRequest;
};

type ResponseSchemaNode = {
  additionalProperties?: unknown;
  items?: ResponseSchemaNode;
  properties?: Record<string, ResponseSchemaNode>;
  required?: unknown;
  type?: unknown;
};

type ChatCompletionRequest = {
  messages?: { content?: unknown; role?: unknown }[];
  model?: unknown;
  response_format?: {
    json_schema?: {
      name?: unknown;
      schema?: ResponseSchemaNode;
      strict?: unknown;
    };
    type?: unknown;
  };
};

beforeEach(() => {
  process.env.OPENROUTER_CARD_MODEL = TEST_OPENROUTER_CARD_MODEL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalOpenRouterCardModel === undefined) {
    Reflect.deleteProperty(process.env, 'OPENROUTER_CARD_MODEL');
  } else {
    process.env.OPENROUTER_CARD_MODEL = originalOpenRouterCardModel;
  }
});

describe('card openrouter', () => {
  test('requires card model', async () => {
    Reflect.deleteProperty(process.env, 'OPENROUTER_CARD_MODEL');

    const fetch = mock(async () =>
      jsonResponse({ output: { summary: 'Unexpected' }, title: 'Unexpected' })
    );

    globalThis.fetch = fetch as never;

    await expect(
      openrouter.generateCardResult({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        prompt: 'Track sleep',
        records: [
          {
            date: '2026-05-20T00:00:00.000Z',
            id: 'record-1',
            tags: [{ name: 'sleep' }],
            text: 'Slept well',
          },
        ],
      })
    ).rejects.toThrow('OPENROUTER_CARD_MODEL is required');

    expect(fetch).not.toHaveBeenCalled();
  });

  test('repairs invalid output', async () => {
    let callCount = 0;

    const fetch = mock(async () => {
      callCount += 1;

      return callCount === 1
        ? jsonResponse({ output: {}, title: 'Bad' })
        : jsonResponse({ output: { summary: 'Better' }, title: 'Good' });
    });

    globalThis.fetch = fetch as never;

    await expect(
      openrouter.generateCardResult({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        prompt: 'Track sleep',
        records: [
          {
            date: '2026-05-20T00:00:00.000Z',
            id: 'record-1',
            tags: [{ name: 'sleep' }],
            text: 'Slept well',
          },
        ],
      })
    ).resolves.toEqual({
      output: { metrics: [], milestones: [], summary: 'Better' },
      success: true,
      title: 'Good',
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('retries invalid json', async () => {
    let callCount = 0;

    const fetch = mock(async () => {
      callCount += 1;

      return callCount === 1
        ? malformedJsonResponse()
        : jsonResponse({ output: { summary: 'Recovered.' }, title: 'Sleep' });
    });

    globalThis.fetch = fetch as never;

    await expect(
      openrouter.generateCardResult({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        prompt: 'Track sleep',
        records: [
          {
            date: '2026-05-20T00:00:00.000Z',
            id: 'record-1',
            tags: [{ name: 'sleep' }],
            text: 'Slept well',
          },
        ],
      })
    ).resolves.toMatchObject({
      output: { summary: 'Recovered.' },
      success: true,
      title: 'Sleep',
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('returns tweak output', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        output: { summary: 'Weekly trend is steady.' },
        title: 'Weekly sleep',
      })
    ) as never;

    await expect(
      openrouter.tweakCardResult({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        previousOutput: {
          metrics: [],
          milestones: [],
          summary: 'Sleep is steady.',
        },
        prompt: 'Track sleep',
        records: [
          {
            date: '2026-05-20T00:00:00.000Z',
            id: 'record-1',
            tags: [{ name: 'sleep' }],
            text: 'Slept well',
          },
        ],
        tweakPrompt: 'Make it weekly',
      })
    ).resolves.toEqual({
      output: {
        metrics: [],
        milestones: [],
        summary: 'Weekly trend is steady.',
      },
      success: true,
      title: 'Weekly sleep',
    });
  });

  test('prioritizes tweak', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: { summary: 'Weekly trend includes naps.' },
        title: null,
      });
    }) as never;

    await openrouter.tweakCardResult({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      previousOutput: {
        metrics: [],
        milestones: [],
        summary: 'Sleep is steady.',
      },
      prompt: 'Track sleep. Do not include naps.',
      records: [
        {
          date: '2026-05-20T00:00:00.000Z',
          id: 'record-1',
          tags: [{ name: 'sleep' }],
          text: 'Slept well and took a nap',
        },
      ],
      tweakPrompt: 'Include naps',
    });

    const messages = requestBody?.messages ?? [];
    const systemMessage = messages.find((message) => message.role === 'system');
    const userMessage = messages.find((message) => message.role === 'user');

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      outputRules?: string;
      outputSchema?: unknown;
      requiredJsonShape?: unknown;
    };

    expect(requestBody?.response_format?.type).toBe('json_schema');
    expect(systemMessage?.content).toContain('Apply only the requested tweak');
    expect(userPayload.outputRules).toContain('tweakPrompt wins');
    expect(userPayload.outputRules).toContain('this output');
    expect(userPayload.outputSchema).toBeUndefined();
    expect(userPayload.requiredJsonShape).toBeUndefined();
  });

  test('compacts record context', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: { summary: 'Long record context was summarized.' },
        title: 'Long context',
      });
    }) as never;

    await openrouter.generateCardResult({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      prompt: 'Track detailed progress',
      records: [
        {
          author: { name: 'Cade' },
          date: '2026-05-20T00:00:00.000Z',
          id: 'record-1',
          tags: [{ name: 'progress' }],
          text: 'x'.repeat(3000),
        },
      ],
      totalRecordCount: 10,
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      outputRules?: string;
      outputSchema?: unknown;
      records?: {
        fullTextRecords?: { author?: unknown; id?: unknown; text?: string }[];
        timelineChunks?: {
          records?: { author?: unknown; id?: unknown; text?: string }[];
        }[];
      };
      requiredJsonShape?: unknown;
      sourceRules?: string;
    };

    expect(requestBody?.model).toBe(TEST_OPENROUTER_CARD_MODEL);
    expect(requestBody?.response_format?.type).toBe('json_schema');
    expect(userPayload.records?.fullTextRecords?.[0]?.text).toHaveLength(2000);
    expect(userPayload.records?.fullTextRecords?.[0]?.author).toBe('Cade');

    expect(
      userPayload.records?.timelineChunks?.[0]?.records?.[0]?.text
    ).toHaveLength(280);

    expect(userPayload.records?.timelineChunks?.[0]?.records?.[0]?.author).toBe(
      'Cade'
    );

    expect(userPayload.records?.fullTextRecords?.[0]?.id).toBeUndefined();

    expect(
      userPayload.records?.timelineChunks?.[0]?.records?.[0]?.id
    ).toBeUndefined();

    expect(userPayload.outputSchema).toBeUndefined();
    expect(userPayload.requiredJsonShape).toBeUndefined();
    expect(userPayload.outputRules).toContain('numeric point-in-time metrics');
    expect(userPayload.outputRules).toContain('cumulative/extreme/count');
    expect(userPayload.outputRules).toContain('distinct job');
    expect(userPayload.outputRules).toContain('obvious chart value');
    expect(userPayload.outputRules).toContain('valueFormat');
    expect(userPayload.outputRules).toContain('full source record.date ISO');
    expect(userPayload.outputRules).toContain('summary at most 320');

    expect(userPayload.outputRules).toContain(
      'adds context not clear from chart'
    );

    expect(userPayload.outputRules).toContain('meaning-changing qualifiers');
    expect(userPayload.outputRules).toContain('time windows');
    expect(userPayload.outputRules).toContain('Never use date-only');

    expect(userPayload.sourceRules).toContain(
      'do not treat omitted records as inspected'
    );
  });

  test('plans exact spec', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        mode: 'exact',
        rationale: 'The prompt asks for an exact count.',
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
      });
    }) as never;

    await expect(
      openrouter.planCardAnalysis({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        prompt: 'Count whining.',
        records: [{ id: 'record-1', text: 'Whined once. '.repeat(200) }],
      })
    ).resolves.toMatchObject({
      analysisSpec: {
        aggregations: [{ id: 'whining_count', operation: 'count' }],
      },
      mode: 'exact',
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      records?: { fullRecords?: unknown[]; summary?: unknown };
      rules?: string;
    };

    expect(userPayload.records?.fullRecords).toHaveLength(1);

    expect(
      (userPayload.records?.fullRecords?.[0] as { text?: string } | undefined)
        ?.text
    ).toHaveLength(899);

    expect(userPayload.rules).toContain('countMode');
    expect(userPayload.rules).toContain('scoreScale');
    expect(userPayload.rules).toContain('thresholds');
    expect(userPayload.rules).toContain('time windows compactly');
    expect(requestBody?.model).toBe(TEST_OPENROUTER_CARD_MODEL);
    expect(requestBody?.response_format?.type).toBe('json_schema');
  });

  test('uses strict planner schema', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        analysisSpec: null,
        mode: 'narrative',
        rationale: null,
      });
    }) as never;

    await openrouter.planCardAnalysis({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      prompt: 'Compare recent sessions.',
      records: [{ id: 'record-1', text: 'Settled well.' }],
    });

    const schema = requestBody?.response_format?.json_schema?.schema;
    const properties = schema?.properties ?? {};
    const analysisSpec = properties.analysisSpec;
    const specProperties = analysisSpec?.properties ?? {};
    const aggregation = specProperties.aggregations?.items;
    const filter = specProperties.filters?.items;
    expect(requestBody?.response_format?.type).toBe('json_schema');
    expect(schema?.required).toEqual(['analysisSpec', 'mode', 'rationale']);
    expect(analysisSpec?.type).toEqual(['object', 'null']);

    expect(aggregation?.required).toEqual(
      Object.keys(aggregation?.properties ?? {})
    );

    expect(aggregation?.required).toContain('denominatorId');

    expect(aggregation?.properties?.denominatorId?.type).toEqual([
      'string',
      'null',
    ]);

    expect(filter?.required).toEqual(Object.keys(filter?.properties ?? {}));
    expect(filter?.properties?.endExclusive?.type).toEqual(['object', 'null']);
  });

  test('plans date filter', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        mode: 'exact',
        rationale: 'The prompt asks for a filtered average.',
        analysisSpec: {
          aggregations: [
            {
              denominatorId: null,
              eventLabel: null,
              fieldId: 'duration',
              id: 'duration_average',
              label: 'Average duration',
              numeratorId: null,
              operation: 'average',
              outcomeLabel: null,
              qualitativeLabel: null,
              unit: 'min',
            },
          ],
          charts: [],
          extractionFields: [
            {
              countMode: null,
              id: 'duration',
              label: 'Duration',
              labels: [],
              scoreScale: null,
              type: 'number',
              unit: 'min',
            },
          ],
          filters: [
            {
              endExclusive: { type: 'generationTime', value: null },
              field: 'record.date',
              id: 'last_3_months',
              label: 'Last 3 months',
              startInclusive: {
                offset: { amount: -3, unit: 'month' },
                type: 'generationTime',
                value: null,
              },
            },
          ],
          groupings: [],
        },
      });
    }) as never;

    await expect(
      openrouter.planCardAnalysis({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        generationTime: '2026-05-23T12:00:00.000Z',
        prompt: 'Average duration over the last 3 months.',
        records: [{ id: 'record-1', text: 'Duration: 10 min.' }],
      })
    ).resolves.toMatchObject({
      analysisSpec: {
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
      },
      mode: 'exact',
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      card?: { generationTime?: string };
      rules?: string;
    };

    expect(userPayload.card?.generationTime).toBe('2026-05-23T12:00:00.000Z');
    expect(userPayload.rules).toContain('record.date');
    expect(userPayload.rules).toContain('rolling calendar offsets');
  });

  test('adds local filter', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        mode: 'exact',
        rationale: 'The prompt asks for an average.',
        analysisSpec: {
          aggregations: [
            {
              denominatorId: null,
              eventLabel: null,
              fieldId: 'duration',
              id: 'duration_average',
              label: 'Average duration',
              numeratorId: null,
              operation: 'average',
              outcomeLabel: null,
              qualitativeLabel: null,
              unit: 'min',
            },
          ],
          charts: [],
          extractionFields: [
            {
              countMode: null,
              id: 'duration',
              label: 'Duration',
              labels: [],
              scoreScale: null,
              type: 'number',
              unit: 'min',
            },
          ],
          groupings: [],
        },
      })
    ) as never;

    await expect(
      openrouter.planCardAnalysis({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        generationTime: '2026-05-23T12:00:00.000Z',
        prompt: 'Average duration over the last 3 months.',
        records: [{ id: 'record-1', text: 'Duration: 10 min.' }],
      })
    ).resolves.toMatchObject({
      analysisSpec: {
        filters: [{ id: 'last_3_months', field: 'record.date' }],
      },
      mode: 'exact',
    });
  });

  test('keeps temporal count exact', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        analysisSpec: null,
        mode: 'narrative',
        rationale: 'The prompt is simple.',
      })
    ) as never;

    await expect(
      openrouter.planCardAnalysis({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        generationTime: '2026-05-23T12:00:00.000Z',
        prompt: 'Count whining over the last 3 months.',
        records: [{ id: 'record-1', text: 'Whined once.' }],
      })
    ).resolves.toMatchObject({
      analysisSpec: {
        aggregations: [{ eventLabel: 'whining', operation: 'count' }],
        filters: [{ id: 'last_3_months', field: 'record.date' }],
      },
      mode: 'exact',
    });
  });

  test('downgrades invalid exact plan', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        analysisSpec: null,
        mode: 'exact',
        rationale: 'Exact analysis would need numeric extraction.',
      })
    ) as never;

    await expect(
      openrouter.planCardAnalysis({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        prompt:
          'Make a line chart over time with Alone duration (min) and Peak distress (0-5). Summarize latest duration and max with distress <=2.',
        records: [
          {
            date: '2026-05-20T00:00:00.000Z',
            id: 'record-1',
            text: 'Alone duration (min): 85\nPeak distress (0-5): 2',
          },
        ],
      })
    ).resolves.toEqual({ mode: 'narrative' });
  });

  test('samples planner records', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        analysisSpec: null,
        mode: 'narrative',
        rationale: null,
      });
    }) as never;

    await openrouter.planCardAnalysis({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      prompt: 'Count whining by month.',
      records: Array.from({ length: 80 }, (_item, index) => ({
        date: `2026-05-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
        id: `record-${index}`,
        tags: [{ name: index < 40 ? 'Session' : 'Trigger' }],
        text: `Session ${index}`,
      })),
      totalRecordCount: 80,
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      records?: {
        samples?: {
          firstRecords?: unknown[];
          middleRecords?: unknown[];
          recentRecords?: unknown[];
        };
        summary?: {
          providedRecordCount?: number;
          tagCounts?: Record<string, number>;
          totalMatchingRecordCount?: number;
        };
      };
    };

    expect(userPayload.records?.summary).toMatchObject({
      providedRecordCount: 80,
      tagCounts: { Session: 40, Trigger: 40 },
      totalMatchingRecordCount: 80,
    });

    expect(userPayload.records?.samples?.firstRecords).toHaveLength(12);
    expect(userPayload.records?.samples?.middleRecords).toHaveLength(12);
    expect(userPayload.records?.samples?.recentRecords).toHaveLength(24);
  });

  test('downgrades exact', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        analysisSpec: null,
        mode: 'narrative',
        rationale: 'The prompt asks for a comparison summary.',
      })
    ) as never;

    await expect(
      openrouter.planCardAnalysis({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        prompt: 'Compare the mood of recent sessions.',
        records: [{ id: 'record-1', text: 'Settled well.' }],
      })
    ).resolves.toEqual({ mode: 'narrative' });
  });

  test('keeps tag counts exact', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        analysisSpec: {
          aggregations: [],
          charts: [],
          extractionFields: [],
          groupings: [],
        },
        mode: 'narrative',
        rationale: 'The prompt is simple.',
      })
    ) as never;

    await expect(
      openrouter.planCardAnalysis({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        prompt: 'Can you chart tag counts.',
        records: [{ id: 'record-1', text: 'Tagged record.' }],
      })
    ).resolves.toMatchObject({
      analysisSpec: {
        aggregations: [{ id: 'record_count', operation: 'count' }],
        charts: [{ id: 'tag_counts', x: { dimension: 'tag' } }],
      },
      mode: 'exact',
    });
  });

  test('sends exact records', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: { summary: 'Exact direct counts.' },
        title: 'Exact counts',
      });
    }) as never;

    await openrouter.generateCardResult({
      analysisMode: 'exact',
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      exactFacts: {
        aggregateValues: {},
        analysisSpec: {
          aggregations: [],
          charts: [],
          extractionFields: [],
          groupings: [],
        },
        metrics: [{ label: 'Records', value: 47 }],
        selectedTagCounts: {},
        totalMatchingRecordCount: 47,
      },
      prompt: 'Count whining and barking.',
      records: Array.from({ length: 47 }, (_item, index) => ({
        date: `2026-05-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
        id: `record-${index}`,
        text: `Session ${index}`,
      })),
      totalRecordCount: 47,
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      records?: { fullTextRecords?: unknown[]; mode?: string };
      sourceRules?: string;
    };

    expect(userPayload.records?.mode).toBe('exact');
    expect(userPayload.records?.fullTextRecords).toHaveLength(47);
    expect(userPayload.sourceRules).toContain('computed deterministically');
  });

  test('sends exact facts', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: { summary: 'Exact extracted counts.' },
        title: 'Exact counts',
      });
    }) as never;

    await openrouter.generateCardResult({
      analysisMode: 'exact',
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      exactFacts: {
        aggregateValues: {
          barking_count: {
            id: 'barking_count',
            label: 'Barking',
            operation: 'count',
            recordIds: ['record-1'],
            value: 8,
          },
        },
        analysisSpec: {
          aggregations: [],
          charts: [],
          extractionFields: [],
          groupings: [],
        },
        eventCounts: { barking: 8, whining: 14 },
        metrics: [{ label: 'Barking', value: 8 }],
        selectedTagCounts: { 'tag-a': 80 },
        totalMatchingRecordCount: 80,
      },
      prompt: 'Count whining and barking.',
      records: [
        {
          date: '2026-05-20T00:00:00.000Z',
          id: 'record-1',
          tags: [{ name: 'Session' }],
          text: 'Whining once.',
        },
      ],
      totalRecordCount: 80,
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      exactFacts?: {
        aggregateValues?: Record<string, { recordIds?: unknown }>;
        analysisSpec?: unknown;
        eventCounts?: Record<string, number>;
      };
      records?: { mode?: string };
      sourceRules?: string;
    };

    expect(userPayload.records?.mode).toBe('exact');

    expect(userPayload.exactFacts?.eventCounts).toEqual({
      barking: 8,
      whining: 14,
    });

    expect(userPayload.exactFacts?.analysisSpec).toBeUndefined();

    expect(
      userPayload.exactFacts?.aggregateValues?.barking_count?.recordIds
    ).toBeUndefined();

    expect(userPayload.sourceRules).toContain('locked');
  });

  test('dedupes exact metrics', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        output: {
          chart: {
            data: [{ label: 'links', value: 99 }],
            title: 'Tag counts',
            type: 'bar',
          },
          metrics: [{ label: 'Total records', value: 486 }],
        },
        title: 'Tag counts',
      })
    ) as never;

    const result = await openrouter.generateCardResult({
      analysisMode: 'exact',
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      exactFacts: {
        aggregateValues: {},
        analysisSpec: {
          aggregations: [],
          charts: [],
          extractionFields: [],
          groupings: [],
        },
        chart: {
          data: [{ label: 'links', value: 100 }],
          title: 'Tag counts',
          type: 'bar',
        },
        metrics: [
          { label: 'Records', value: 485 },
          { label: 'Sessions', value: 485 },
        ],
        selectedTagCounts: {},
        totalMatchingRecordCount: 485,
      },
      prompt: 'Can you chart tag counts.',
      records: [{ id: 'record-1', text: 'Tagged record.' }],
      totalRecordCount: 485,
    });

    expect(result.output.chart?.data).toEqual([{ label: 'links', value: 100 }]);

    expect(result.output.metrics).toEqual([
      { label: 'Total records', value: 485 },
      { label: 'Sessions', value: 485 },
    ]);
  });

  test('keeps incompatible exact shape', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        output: {
          chart: {
            series: [
              {
                data: [{ label: '2026-05-20T00:00:00.000Z', value: 85 }],
                label: 'Duration',
                unit: 'min',
              },
            ],
            title: 'Duration',
            type: 'line',
          },
          metrics: [{ label: 'Latest duration', unit: 'min', value: 85 }],
        },
        title: 'Duration',
      })
    ) as never;

    await expect(
      openrouter.generateCardResult({
        analysisMode: 'exact',
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        exactFacts: {
          aggregateValues: {},
          analysisSpec: {
            aggregations: [],
            charts: [],
            extractionFields: [],
            groupings: [],
          },
          chart: {
            data: [{ label: 'alone duration (min)', value: 47 }],
            title: 'Event counts',
            type: 'bar',
          },
          metrics: [{ label: 'Alone duration min', value: 47 }],
          selectedTagCounts: {},
          totalMatchingRecordCount: 47,
        },
        prompt:
          'Make a line chart over time with Alone duration (min) and Peak distress (0-5).',
        records: [
          {
            date: '2026-05-20T00:00:00.000Z',
            id: 'record-1',
            text: 'Alone duration (min): 85\nPeak distress (0-5): 2',
          },
        ],
      })
    ).resolves.toMatchObject({
      output: {
        chart: { series: [{ label: 'Duration' }], type: 'line' },
        metrics: [{ label: 'Latest duration', unit: 'min', value: 85 }],
      },
      success: true,
    });
  });

  test('extracts record facts', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        records: [
          {
            events: [
              {
                count: 2,
                evidence: 'Whined twice.',
                fieldId: 'events',
                label: 'Whining',
              },
            ],
            evidence: [],
            numericValues: [],
            outcomes: [],
            qualitativeLabels: [],
            recordIndex: 1,
          },
          {
            events: [],
            evidence: [],
            numericValues: [],
            outcomes: [],
            qualitativeLabels: [],
            recordIndex: 2,
          },
        ],
      });
    }) as never;

    await expect(
      openrouter.extractRecordFacts({
        analysisSpec: {
          aggregations: [],
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
        },
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        records: [
          { id: 'record-1', text: 'Whined twice.' },
          { id: 'record-2', text: 'Settled.' },
        ],
      })
    ).resolves.toEqual([
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
        recordId: 'record-1',
      },
      {
        events: [],
        evidence: [],
        numericValues: [],
        outcomes: [],
        qualitativeLabels: [],
        recordId: 'record-2',
      },
    ]);

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      records?: { id?: unknown; recordIndex?: number }[];
    };

    expect(userPayload.records?.[0]).toMatchObject({ recordIndex: 1 });
    expect(userPayload.records?.[0]?.id).toBeUndefined();
    expect(requestBody?.model).toBe(TEST_OPENROUTER_CARD_MODEL);
  });

  test('rejects omitted facts', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        records: [
          {
            events: [],
            evidence: [],
            numericValues: [],
            outcomes: [],
            qualitativeLabels: [],
            recordIndex: 1,
          },
        ],
      })
    ) as never;

    await expect(
      openrouter.extractRecordFacts({
        analysisSpec: {
          aggregations: [],
          charts: [],
          extractionFields: [],
          groupings: [],
        },
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        records: [
          { id: 'record-1', text: 'Whined twice.' },
          { id: 'record-2', text: 'Settled.' },
        ],
      })
    ).rejects.toThrow('omitted records');
  });

  test('repairs omitted facts', async () => {
    let callCount = 0;
    let repairPayload: { repairMessage?: string } | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      callCount += 1;
      const request = await readChatRequest(input, init);

      const userMessage = request.messages?.find(
        (message) => message.role === 'user'
      );

      repairPayload = JSON.parse(String(userMessage?.content));

      return callCount === 1
        ? jsonResponse({
            records: [
              {
                events: [],
                evidence: [],
                numericValues: [],
                outcomes: [],
                qualitativeLabels: [],
                recordIndex: 1,
              },
            ],
          })
        : jsonResponse({
            records: [
              {
                events: [],
                evidence: [],
                numericValues: [],
                outcomes: [],
                qualitativeLabels: [],
                recordIndex: 1,
              },
              {
                events: [],
                evidence: [],
                numericValues: [],
                outcomes: [],
                qualitativeLabels: [],
                recordIndex: 2,
              },
            ],
          });
    }) as never;

    await expect(
      openrouter.extractRecordFacts({
        analysisSpec: {
          aggregations: [],
          charts: [],
          extractionFields: [],
          groupings: [],
        },
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        records: [
          { id: 'record-1', text: 'Whined twice.' },
          { id: 'record-2', text: 'Settled.' },
        ],
      })
    ).resolves.toHaveLength(2);

    expect(callCount).toBe(2);
    expect(repairPayload?.repairMessage).toContain('every input recordIndex');
  });

  test('sends blueprint', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: {
          metrics: [{ label: 'Average', unit: 'hrs', value: 7 }],
          milestones: [],
        },
        title: 'Sleep',
      });
    }) as never;

    await openrouter.generateCardResult({
      blueprint: {
        chart: { kind: 'data', title: 'Trend', type: 'line' },
        metrics: [{ label: 'Average', unit: 'hrs', value: 7 }],
      },
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      prompt: 'Track sleep',
      records: [
        {
          date: '2026-05-20T00:00:00.000Z',
          id: 'record-1',
          tags: [{ name: 'sleep' }],
          text: 'Slept 7 hours',
        },
      ],
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      card?: { blueprint?: unknown };
      outputRules?: string;
    };

    expect(userPayload.card?.blueprint).toEqual({
      chart: { kind: 'data', title: 'Trend', type: 'line' },
      metrics: [{ label: 'Average', unit: 'hrs', value: 7 }],
    });

    expect(userPayload.outputRules).toContain('card.blueprint');
    expect(userPayload.outputRules).toContain('card.blueprint.summary');
    expect(userPayload.outputRules).toContain('Do not add sections absent');
  });

  test('sends card context', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: { summary: 'Distinct progress view.' },
        title: 'Progress',
      });
    }) as never;

    await openrouter.generateCardResult({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      existingCards: [
        {
          id: 'card-existing',
          output: {
            chart: {
              data: [{ label: '2026-05-20T00:00:00.000Z', value: 7 }],
              title: 'Sleep trend',
              type: 'line',
              unit: 'hrs',
            },
            metrics: [{ label: 'Average sleep', unit: 'hrs', value: 7 }],
            milestones: [{ title: 'Baseline beat' }],
            summary: 'Sleep trend already covers weekly averages.',
          },
          prompt: 'Track average sleep across the week.',
          tags: [{ name: 'sleep' }],
          title: 'Sleep trend',
        },
      ],
      prompt: 'Track sleep quality',
      records: [
        {
          date: '2026-05-20T00:00:00.000Z',
          id: 'record-1',
          tags: [{ name: 'sleep' }],
          text: 'Slept 7 hours and felt rested.',
        },
      ],
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      existingCards?: {
        id?: string;
        sections?: {
          chart?: unknown;
          metrics?: unknown[];
          milestoneTitles?: string[];
          summary?: string;
        };
        tags?: unknown;
      }[];
      outputRules?: string;
    };

    expect(userPayload.existingCards?.[0]).toMatchObject({
      sections: {
        chart: {
          seriesLabels: [],
          title: 'Sleep trend',
          type: 'line',
          unit: 'hrs',
        },
        metrics: [{ label: 'Average sleep', unit: 'hrs' }],
        milestoneTitles: ['Baseline beat'],
        summary: 'Sleep trend already covers weekly averages.',
      },
    });

    expect(userPayload.existingCards?.[0]?.id).toBeUndefined();
    expect('tags' in (userPayload.existingCards?.[0] ?? {})).toBe(false);
    expect(userPayload.outputRules).toContain('existingCards');
    expect(userPayload.outputRules).toContain('exactly the same source tags');
    expect(userPayload.outputRules).toContain('distinct angle');
    expect(userPayload.outputRules).toContain('unless the requested card');
  });

  test('compacts suggestions', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);
      return jsonResponse({ prompt: 'Track weekly progress milestones.' });
    }) as never;

    await openrouter.generateCardPromptSuggestion({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      existingCards: [],
      records: [
        {
          author: { name: 'Cade' },
          date: '2026-05-20T00:00:00.000Z',
          id: 'record-1',
          tags: [{ name: 'progress' }],
          text: 'x'.repeat(800),
        },
      ],
    });

    const systemMessage = requestBody?.messages?.find(
      (message) => message.role === 'system'
    );

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      outputRules?: string;
      records?: {
        author?: unknown;
        id?: unknown;
        tags?: unknown;
        text?: string;
      }[];
      supportedCharts?: string;
    };

    expect(systemMessage?.content).toContain('reusable');
    expect(systemMessage?.content).toContain('dated tagged user log entries');
    expect(systemMessage?.content).toContain('new matching records');
    expect(userPayload.outputRules).toContain('one editable prompt');
    expect(userPayload.outputRules).toContain('future records');
    expect(userPayload.outputRules).toContain('supportedCharts');
    expect(userPayload.supportedCharts).toContain('line charts and bar charts');
    expect(userPayload.supportedCharts).toContain('not stacked or grouped');
    expect(userPayload.supportedCharts).toContain('pie');
    expect(userPayload.records?.[0]?.text).toHaveLength(500);
    expect(userPayload.records?.[0]?.author).toBe('Cade');
    expect(userPayload.records?.[0]?.tags).toEqual(['progress']);
    expect(userPayload.records?.[0]?.id).toBeUndefined();
    expect(requestBody?.model).toBe(TEST_OPENROUTER_CARD_MODEL);
    expect(requestBody?.response_format?.type).toBe('json_schema');
  });

  test('uses refresh schema', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: {
          chart: null,
          metrics: [],
          milestones: [],
          summary: 'Updated summary.',
        },
      });
    }) as never;

    const result = await openrouter.refreshCardResult({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      previousOutput: {
        metrics: [],
        milestones: [{ title: 'Old source' }],
        summary: 'Old summary.',
      },
      prompt: 'Track sleep',
      records: [
        {
          date: '2026-05-20T00:00:00.000Z',
          id: 'record-1',
          tags: [{ name: 'sleep' }],
          text: 'Slept well',
        },
      ],
    });

    const userMessage = requestBody?.messages?.find(
      (message) => message.role === 'user'
    );

    const userPayload = JSON.parse(String(userMessage?.content)) as {
      card?: { previousOutput?: { milestones?: { title?: string }[] } };
      outputRules?: string;
    };

    expect(result.output).not.toHaveProperty('sourceRecordIds');

    expect(userPayload.card?.previousOutput?.milestones?.[0]?.title).toBe(
      'Old source'
    );

    expect(requestBody?.response_format?.type).toBe('json_schema');

    expect(userPayload.outputRules).toContain(
      'curate the current best milestone set'
    );

    expect(userPayload.outputRules).toContain('Prefer summary null');
    expect(userPayload.outputRules).toContain('keep its title and detail');
    expect(userPayload.outputRules).toContain('date exactly');
  });

  test('handles refusal', async () => {
    globalThis.fetch = mock(async () =>
      refusalResponse('I cannot generate this card.')
    ) as never;

    await expect(
      openrouter.generateCardResult({
        env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
        prompt: 'Track sleep',
        records: [
          {
            date: '2026-05-20T00:00:00.000Z',
            id: 'record-1',
            tags: [{ name: 'sleep' }],
            text: 'Slept well',
          },
        ],
      })
    ).rejects.toThrow('OpenRouter card generation refused');
  });

  test('trims suggestion', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({ prompt: 'x'.repeat(600) })
    ) as never;

    const prompt = await openrouter.generateCardPromptSuggestion({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      existingCards: [],
      records: [],
    });

    expect(prompt).toHaveLength(500);
  });
});
