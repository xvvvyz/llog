import { enqueueJob, parseJob, type Job } from '@/api/jobs/payload';
import { describe, expect, test } from 'bun:test';

const requestedAt = '2026-05-20T00:00:00.000Z';

describe('queue jobs', () => {
  test('parses payloads', () => {
    expect(
      parseJob({
        cardId: 'card-1',
        requestedAt,
        schemaVersion: 1,
        type: 'card.generate',
      }).type
    ).toBe('card.generate');

    expect(
      parseJob({
        cardId: 'card-1',
        requestedAt,
        schemaVersion: 1,
        type: 'card.refresh',
      }).type
    ).toBe('card.refresh');

    expect(
      parseJob({
        cardId: 'card-1',
        requestedAt,
        schemaVersion: 1,
        tweakPrompt: 'Make it tighter',
        type: 'card.tweak',
      }).type
    ).toBe('card.tweak');

    expect(
      parseJob({
        analysisId: 'analysis-1',
        cardId: 'card-1',
        chunkIndex: 0,
        requestedAt,
        schemaVersion: 1,
        type: 'analysis.extract',
      }).type
    ).toBe('analysis.extract');

    expect(
      parseJob({
        analysisId: 'analysis-1',
        cardId: 'card-1',
        requestedAt,
        schemaVersion: 1,
        type: 'analysis.finalize',
      }).type
    ).toBe('analysis.finalize');

    expect(
      parseJob({
        fileId: 'file-1',
        requestedAt,
        schemaVersion: 1,
        type: 'audio.transcribe',
      }).type
    ).toBe('audio.transcribe');

    expect(
      parseJob({
        fileId: 'file-1',
        requestedAt,
        schemaVersion: 1,
        type: 'audio.identify',
      }).type
    ).toBe('audio.identify');
  });

  test('rejects invalid payloads', () => {
    expect(() =>
      parseJob({
        cardId: 'card-1',
        requestedAt: 'not-a-date',
        schemaVersion: 1,
        type: 'card.generate',
      })
    ).toThrow();
  });

  test('dispatches json', async () => {
    const sent: { job: Job; options?: QueueSendOptions }[] = [];

    const job: Job = {
      cardId: 'card-1',
      requestedAt,
      schemaVersion: 1,
      type: 'card.refresh',
    };

    await enqueueJob(
      {
        JOBS_QUEUE: {
          send: async (body: Job, options?: QueueSendOptions) => {
            sent.push({ job: body, options });

            return {
              metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
            };
          },
        } as Queue<Job>,
      },
      job,
      { delaySeconds: 10 }
    );

    expect(sent).toEqual([
      { job, options: { contentType: 'json', delaySeconds: 10 } },
    ]);
  });
});
