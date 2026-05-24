import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const originalFetch = globalThis.fetch;
const originalOpenAiSttModel = process.env.OPENAI_STT_MODEL;
const TEST_OPENAI_STT_MODEL = 'test-transcription-model';

const audioObject = (bytes: Uint8Array, contentType = 'audio/wav') =>
  ({
    arrayBuffer: async () => bytes.buffer.slice(0),
    httpMetadata: { contentType },
    size: bytes.byteLength,
  }) as unknown as R2ObjectBody;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });

beforeEach(() => {
  process.env.OPENAI_STT_MODEL = TEST_OPENAI_STT_MODEL;
});

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalOpenAiSttModel === undefined) {
    Reflect.deleteProperty(process.env, 'OPENAI_STT_MODEL');
  } else {
    process.env.OPENAI_STT_MODEL = originalOpenAiSttModel;
  }
});

describe('audio openai', () => {
  test('requests segments', async () => {
    mock.restore();
    // processor.test mocks this module, so load an unmocked instance here.
    const modulePath = './openai.ts?real';
    const openai = (await import(modulePath)) as typeof import('./openai');
    let entries: [string, FormDataEntryValue][] = [];

    globalThis.fetch = mock(async (input: RequestInfo | URL, init) => {
      const request =
        input instanceof Request ? input : new Request(input, init);

      if (!request.url.includes('/audio/transcriptions')) {
        return originalFetch(request);
      }

      const form = (await request.formData()) as unknown as {
        entries(): IterableIterator<[string, FormDataEntryValue]>;
      };

      entries = [...form.entries()];

      return jsonResponse({
        duration: 2,
        language: 'en',
        segments: [{ end: 2, start: 0, text: ' hello ' }],
        text: 'hello',
      });
    }) as never;

    const result = await openai.transcribeAudioFile({
      env: { OPENAI_API_KEY: 'key' } as CloudflareEnv,
      file: { duration: 2000, id: 'file-1', mimeType: 'audio/wav' },
      object: audioObject(new Uint8Array([1, 2, 3])),
    });

    const uploadedFile = entries.find(([key]) => key === 'file')?.[1];

    const timestampEntries = entries.filter(([key]) =>
      key.startsWith('timestamp_granularities')
    );

    expect(entries.find(([key]) => key === 'model')?.[1]).toBe(
      TEST_OPENAI_STT_MODEL
    );

    expect(entries.find(([key]) => key === 'response_format')?.[1]).toBe(
      'verbose_json'
    );

    expect(entries.find(([key]) => key === 'temperature')?.[1]).toBe('0');

    expect(timestampEntries).toEqual([
      ['timestamp_granularities[]', 'segment'],
    ]);

    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe('recording.wav');
    expect(result).toEqual([{ end: 2, start: 0, text: 'hello' }]);
  });
});
