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

  test('returns tweak prompt', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        output: { summary: 'Weekly trend is steady.' },
        title: 'Weekly sleep',
        updatedPrompt: 'Track weekly sleep progress.',
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
      updatedPrompt: 'Track weekly sleep progress.',
    });
  });

  test('prioritizes tweak', async () => {
    let requestBody: ChatCompletionRequest | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      requestBody = await readChatRequest(input, init);

      return jsonResponse({
        output: { summary: 'Weekly trend includes naps.' },
        updatedPrompt: 'Track weekly sleep progress, including naps.',
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
      outputSchema?: { updatedPrompt?: string };
    };

    expect(requestBody?.response_format?.type).toBe('json_schema');

    expect(requestBody?.response_format?.json_schema).toMatchObject({
      name: 'llog_card_tweak',
      strict: true,
    });

    expect(systemMessage?.content).toContain('tweakPrompt overrides prompt');
    expect(userPayload.outputRules).toContain('tweakPrompt overrides prompt');

    expect(userPayload.outputRules).toContain(
      'prompt says not to do something'
    );

    expect(userPayload.outputSchema?.updatedPrompt).toContain(
      'remove or rewrite the conflicting original instruction'
    );
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
      outputSchema?: { output?: { sourceRecordIds?: string } };
      records?: {
        fullTextRecords?: { text?: string }[];
        timelineChunks?: { records?: { text?: string }[] }[];
      };
      sourceRules?: string;
    };

    const responseSchema = requestBody?.response_format?.json_schema?.schema;

    const properties = responseSchema?.properties as
      | { output?: { properties?: Record<string, unknown> }; title?: unknown }
      | undefined;

    const outputProperties = properties?.output?.properties;
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

    expect(
      userPayload.records?.timelineChunks?.[0]?.records?.[0]?.text
    ).toHaveLength(280);

    expect(userPayload.outputSchema?.output?.sourceRecordIds).toContain(
      'at most 80'
    );

    expect(userPayload.sourceRules).toContain(
      'do not treat omitted records as inspected'
    );
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
      records?: { text?: string }[];
    };

    expect(systemMessage?.content).toContain('avoid vague analysis prompts');
    expect(userPayload.outputRules).toContain('user-editable prompt');
    expect(userPayload.records?.[0]?.text).toHaveLength(500);
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

    expect(requestBody?.response_format?.type).toBe('json_schema');

    expect(requestBody?.response_format?.json_schema).toMatchObject({
      name: 'llog_card_refresh',
      strict: true,
    });

    expect(requestBody?.response_format?.json_schema?.schema?.required).toEqual(
      ['output']
    );
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
