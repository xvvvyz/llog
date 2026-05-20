import * as processor from '@/api/jobs/processor';
import { describe, expect, mock, test } from 'bun:test';

const calls: { input: unknown; type: string }[] = [];
const db = { tx: {} } as never;
const env = {} as CloudflareEnv;
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
    generateCard: mock(async (input: unknown) => {
      calls.push({ input, type: 'card.generate' });
      return { success: true };
    }),
    processCardRefreshJob: mock(async (input: unknown) => {
      calls.push({ input, type: 'card.refresh' });
      return { success: true };
    }),
    refreshCard: mock(async (input: unknown) => {
      calls.push({ input, type: 'card.refresh-one' });
      return { success: true };
    }),
    tweakCard: mock(async (input: unknown) => {
      calls.push({ input, type: 'card.tweak' });
      return { success: true };
    }),
  },
});

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
        type: 'card.refresh-one',
      },
    });

    expect(calls.map((call) => call.type)).toEqual([
      'card.generate',
      'audio.identify',
      'card.refresh-one',
    ]);
  });

  test('passes final attempt', async () => {
    calls.length = 0;

    await processJob({
      db,
      env,
      isFinalAttempt: true,
      job: {
        logId: 'log-1',
        requestedAt,
        schemaVersion: 1,
        token: 'token-1',
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
});
