import * as processor from '@/api/jobs/processor';
import type { Job } from '@/api/jobs/payload';
import { describe, expect, mock, test } from 'bun:test';

const calls: { input: unknown; type: string }[] = [];
const db = { tx: {} } as never;
const env = {} as unknown as CloudflareEnv;
const requestedAt = '2026-05-20T00:00:00.000Z';

const processJob = processor.createJobProcessor({
  audio: {
    detectAudioFileMusic: mock(async (input: unknown) => {
      calls.push({ input, type: 'audio.identify' });
      return { success: true };
    }),
    transcribeAudioFile: mock(async (input: unknown) => {
      calls.push({ input, type: 'audio.transcribe' });
      return { success: true };
    }),
  },
  cards: {
    extractCardAnalysisChunk: mock(async (input: unknown) => {
      calls.push({ input, type: 'analysis.extract' });
      return { success: true };
    }),
    finalizeCardAnalysis: mock(async (input: unknown) => {
      calls.push({ input, type: 'analysis.finalize' });
      return { success: true };
    }),
    generateCard: mock(async (input: unknown) => {
      calls.push({ input, type: 'card.generate' });
      return { success: true };
    }),
    refreshCard: mock(async (input: unknown) => {
      calls.push({ input, type: 'card.refresh' });
      return { success: true };
    }),
    tweakCard: mock(async (input: unknown) => {
      calls.push({ input, type: 'card.tweak' });
      return { success: true };
    }),
  },
});

const cardGenerateJob = (cardId: string): Job => ({
  cardId,
  requestedAt,
  schemaVersion: 1,
  type: 'card.generate',
});

const createMessage = (body: unknown, attempts = 1) => {
  const state = {
    acked: false,
    retryOptions: [] as (QueueRetryOptions | undefined)[],
  };

  const message = {
    attempts,
    body,
    id: `message-${String(body).length}-${attempts}`,
    timestamp: new Date('2026-05-20T00:00:00.000Z'),
    ack: mock(() => {
      state.acked = true;
    }),
    retry: mock((options?: QueueRetryOptions) => {
      state.retryOptions.push(options);
    }),
  } as Message<unknown>;

  return { message, state };
};

const createBatch = (messages: Message<unknown>[]) =>
  ({
    ackAll: mock(() => {}),
    messages,
    metadata: { metrics: { backlogBytes: 0, backlogCount: messages.length } },
    queue: 'llog-jobs',
    retryAll: mock(() => {}),
  }) as MessageBatch<unknown>;

describe('queue processor', () => {
  test('dispatches jobs', async () => {
    calls.length = 0;

    await processJob({
      db,
      env,
      job: {
        cardId: 'card-1',
        requestedAt,
        schemaVersion: 1,
        type: 'card.generate',
      },
    });

    await processJob({
      db,
      env,
      job: {
        fileId: 'file-1',
        requestedAt,
        schemaVersion: 1,
        type: 'audio.identify',
      },
    });

    await processJob({
      db,
      env,
      job: {
        cardId: 'card-1',
        requestedAt,
        schemaVersion: 1,
        type: 'card.refresh',
      },
    });

    await processJob({
      db,
      env,
      job: {
        analysisId: 'analysis-1',
        cardId: 'card-1',
        chunkIndex: 0,
        requestedAt,
        schemaVersion: 1,
        type: 'analysis.extract',
      },
    });

    expect(calls.map((call) => call.type)).toEqual([
      'card.generate',
      'audio.identify',
      'card.refresh',
      'analysis.extract',
    ]);
  });

  test('passes final attempt', async () => {
    calls.length = 0;

    await processJob({
      db,
      env,
      isFinalAttempt: true,
      job: {
        cardId: 'card-1',
        requestedAt,
        schemaVersion: 1,
        type: 'card.refresh',
      },
    });

    expect(calls[0]?.type).toBe('card.refresh');

    expect(
      (calls[0]?.input as { isFinalAttempt?: boolean }).isFinalAttempt
    ).toBe(true);
  });

  test('gets retry delay', () => {
    expect(
      processor.getJobRetryDelay({ retryAfterSeconds: 60, success: false })
    ).toBe(60);

    expect(processor.getJobRetryDelay({ success: false })).toBeUndefined();
    expect(processor.getJobRetryDelay(false)).toBeUndefined();
  });

  test('processes batch concurrently', async () => {
    const first = createMessage(cardGenerateJob('card-1'));
    const second = createMessage(cardGenerateJob('card-2'));
    const release: (() => void)[] = [];
    let active = 0;
    let peak = 0;

    const queueProcessor = mock(
      async ({ job }: Parameters<typeof processor.processJob>[0]) => {
        active += 1;
        peak = Math.max(peak, active);
        calls.push({ input: job, type: job.type });
        await new Promise<void>((resolve) => release.push(resolve));
        active -= 1;
        return { success: true };
      }
    );

    calls.length = 0;

    const run = processor.processQueueBatch({
      batch: createBatch([first.message, second.message]),
      db,
      env,
      maxDeliveryAttempts: 6,
      processor: queueProcessor,
    });

    expect(release).toHaveLength(2);
    expect(peak).toBe(2);
    release.forEach((resolve) => resolve());
    await run;

    expect(calls.map((call) => call.type)).toEqual([
      'card.generate',
      'card.generate',
    ]);

    expect(first.state.acked).toBe(true);
    expect(second.state.acked).toBe(true);
  });

  test('retries delayed messages', async () => {
    const { message, state } = createMessage(cardGenerateJob('card-1'));

    await processor.processQueueMessage({
      db,
      env,
      maxDeliveryAttempts: 6,
      message,
      processor: mock(async () => ({ retryAfterSeconds: 45, success: false })),
    });

    expect(state.acked).toBe(false);
    expect(state.retryOptions).toEqual([{ delaySeconds: 45 }]);
  });
});
