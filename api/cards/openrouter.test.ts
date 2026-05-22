import * as openrouter from '@/api/cards/openrouter';
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
      model: 'openai/gpt-5.5',
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

type ChatCompletionRequest = {
  messages?: { content?: unknown; role?: unknown }[];
  model?: unknown;
  response_format?: {
    json_schema?: {
      name?: unknown;
      schema?: {
        additionalProperties?: unknown;
        properties?: Record<string, unknown>;
        required?: unknown;
      };
      strict?: unknown;
    };
    type?: unknown;
  };
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('card openrouter', () => {
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
      output: {
        metrics: [],
        milestones: [],
        sourceRecordIds: [],
        summary: 'Better',
      },
      success: true,
      title: 'Good',
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
          sourceRecordIds: [],
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
        sourceRecordIds: [],
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
        sourceRecordIds: [],
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
      outputSchema?: Record<string, unknown>;
    };

    expect(requestBody?.response_format?.type).toBe('json_schema');

    expect(requestBody?.response_format?.json_schema).toMatchObject({
      name: 'llog_card_tweak',
      strict: true,
    });

    expect(systemMessage?.content).toContain('Apply only the requested tweak');
    expect(userPayload.outputRules).toContain('tweakPrompt wins');
    expect(userPayload.outputRules).toContain('this output');

    expect(Object.keys(userPayload.outputSchema ?? {}).sort()).toEqual([
      'output',
      'title',
    ]);
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
      outputSchema?: {
        output?: {
          metrics?: string;
          sourceRecordIds?: string;
          summary?: string;
        };
        title?: string;
      };
      records?: {
        fullTextRecords?: { author?: unknown; text?: string }[];
        timelineChunks?: { records?: { author?: unknown; text?: string }[] }[];
      };
      sourceRules?: string;
    };

    const responseSchema = requestBody?.response_format?.json_schema?.schema;

    const properties = responseSchema?.properties as
      | { output?: { properties?: Record<string, unknown> }; title?: unknown }
      | undefined;

    const outputProperties = properties?.output?.properties;

    const metricSchema = outputProperties?.metrics as
      | { items?: { properties?: Record<string, unknown>; required?: unknown } }
      | undefined;

    expect(requestBody?.model).toBe('openai/gpt-5.5');
    expect(requestBody?.response_format?.type).toBe('json_schema');

    expect(requestBody?.response_format?.json_schema).toMatchObject({
      name: 'llog_card_generation',
      strict: true,
    });

    expect(responseSchema?.additionalProperties).toBe(false);
    expect(responseSchema?.required).toEqual(['title', 'output']);

    expect(outputProperties).toMatchObject({
      chart: { anyOf: [{ type: 'object' }, { type: 'null' }] },
      metrics: { maxItems: 6, type: 'array' },
      milestones: { maxItems: 8, type: 'array' },
      sourceRecordIds: { maxItems: 80, type: 'array' },
      summary: { type: ['string', 'null'] },
    });

    expect(userPayload.records?.fullTextRecords?.[0]?.text).toHaveLength(2000);
    expect(userPayload.records?.fullTextRecords?.[0]?.author).toBe('Cade');

    expect(
      userPayload.records?.timelineChunks?.[0]?.records?.[0]?.text
    ).toHaveLength(280);

    expect(userPayload.records?.timelineChunks?.[0]?.records?.[0]?.author).toBe(
      'Cade'
    );

    expect(userPayload.outputSchema?.output?.sourceRecordIds).toContain(
      'at most 80'
    );

    expect(userPayload.outputSchema?.output?.metrics).toContain(
      'Set trend only'
    );

    expect(userPayload.outputSchema?.output?.metrics).toContain(
      'cumulative/extreme/count'
    );

    expect(userPayload.outputSchema?.output?.metrics).toContain('valueFormat');

    expect(userPayload.outputSchema?.output?.metrics).toContain(
      'full source record.date ISO'
    );

    expect(userPayload.outputSchema?.output?.summary).toContain(
      'Do not write human-formatted dates'
    );

    expect(userPayload.outputSchema?.output?.summary).toContain('320');

    expect(userPayload.outputSchema?.output?.summary).toContain(
      'not clear from chart'
    );

    expect(userPayload.outputSchema?.title).toContain('short generated');
    expect(userPayload.outputRules).toContain('numeric point-in-time metrics');
    expect(userPayload.outputRules).toContain('Never use date-only');

    expect(metricSchema?.items?.properties).toMatchObject({
      valueFormat: { enum: ['date', 'datetime', null] },
    });

    expect(metricSchema?.items?.required).toContain('valueFormat');

    expect(userPayload.sourceRules).toContain(
      'do not treat omitted records as inspected'
    );
  });

  test('sends blueprint', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: {
          metrics: [{ label: 'Average', unit: 'hrs', value: 7 }],
          milestones: [],
          sourceRecordIds: [],
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

  test('sends existing card context', async () => {
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
            sourceRecordIds: ['record-1'],
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
      id: 'card-existing',
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

    expect('tags' in (userPayload.existingCards?.[0] ?? {})).toBe(false);
    expect(userPayload.outputRules).toContain('existingCards');
    expect(userPayload.outputRules).toContain('exactly the same source tags');
    expect(userPayload.outputRules).toContain('distinct angle');
    expect(userPayload.outputRules).toContain('unless the requested card');
  });

  test('compacts suggestion context', async () => {
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
      records?: { author?: unknown; tags?: unknown; text?: string }[];
    };

    expect(systemMessage?.content).toContain('reusable');
    expect(systemMessage?.content).toContain('dated user log entries');
    expect(systemMessage?.content).toContain('future matching records');
    expect(userPayload.outputRules).toContain('one editable prompt');
    expect(userPayload.outputRules).toContain('future records');
    expect(userPayload.records?.[0]?.text).toHaveLength(500);
    expect(userPayload.records?.[0]?.author).toBe('Cade');
    expect(userPayload.records?.[0]?.tags).toEqual(['progress']);
    expect(requestBody?.response_format?.type).toBe('json_schema');

    expect(requestBody?.response_format?.json_schema).toMatchObject({
      name: 'llog_card_prompt_suggestion',
      strict: true,
    });
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
          sourceRecordIds: [],
          summary: 'Updated summary.',
        },
      });
    }) as never;

    await openrouter.refreshCardResult({
      env: { OPENROUTER_API_KEY: 'key' } as CloudflareEnv,
      previousOutput: {
        metrics: [],
        milestones: [],
        sourceRecordIds: [],
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
      outputRules?: string;
    };

    expect(requestBody?.response_format?.type).toBe('json_schema');

    expect(requestBody?.response_format?.json_schema).toMatchObject({
      name: 'llog_card_refresh',
      strict: true,
    });

    expect(requestBody?.response_format?.json_schema?.schema?.required).toEqual(
      ['output']
    );

    expect(userPayload.outputRules).toContain(
      'curate the current best milestone set'
    );

    expect(userPayload.outputRules).toContain('summary null');
    expect(userPayload.outputRules).toContain('keep its title and detail');
    expect(userPayload.outputRules).toContain('recordIds exactly');
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
