import * as audioAnalysis from '@/api/audio-analysis/processor';
import * as cardActions from '@/api/cards/card-actions';
import type { Job } from '@/api/jobs/payload';
import type { Db } from '@/api/middleware/db';

export type JobResult = { retryAfterSeconds?: number; success?: boolean };

type AudioJobActions = {
  detectAudioFileMusic: (
    input: Parameters<typeof audioAnalysis.detectAudioFileMusic>[0]
  ) => Promise<JobResult | boolean>;
  transcribeAudioFile: (
    input: Parameters<typeof audioAnalysis.transcribeAudioFile>[0]
  ) => Promise<JobResult | boolean>;
};

type CardJobActions = {
  generateCard: (
    input: Parameters<typeof cardActions.generateCard>[0]
  ) => Promise<JobResult | boolean>;
  refreshCard: (
    input: Parameters<typeof cardActions.refreshCard>[0]
  ) => Promise<JobResult | boolean>;
  tweakCard: (
    input: Parameters<typeof cardActions.tweakCard>[0]
  ) => Promise<JobResult | boolean>;
};

export const getJobRetryDelay = (result: JobResult | boolean | undefined) => {
  if (!result || typeof result !== 'object') return;
  const retryAfterSeconds = result.retryAfterSeconds;

  return typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0
    ? retryAfterSeconds
    : undefined;
};

export const createJobProcessor =
  ({
    audio = audioAnalysis,
    cards = cardActions,
  }: { audio?: AudioJobActions; cards?: CardJobActions } = {}) =>
  async ({
    db,
    env,
    isFinalAttempt,
    job,
  }: {
    db: Db;
    env: CloudflareEnv;
    isFinalAttempt?: boolean;
    job: Job;
  }): Promise<JobResult | boolean> => {
    switch (job.type) {
      case 'card.generate': {
        return cards.generateCard({
          cardId: job.cardId,
          dbClient: db,
          env,
          isFinalAttempt,
          requestedAt: job.requestedAt,
        });
      }

      case 'card.refresh': {
        return cards.refreshCard({
          cardId: job.cardId,
          dbClient: db,
          env,
          isFinalAttempt,
          requestedAt: job.requestedAt,
        });
      }

      case 'card.tweak': {
        return cards.tweakCard({
          cardId: job.cardId,
          dbClient: db,
          env,
          isFinalAttempt,
          requestedAt: job.requestedAt,
          tweakPrompt: job.tweakPrompt,
        });
      }

      case 'audio.transcribe': {
        return audio.transcribeAudioFile({
          db,
          env,
          fileId: job.fileId,
          isFinalAttempt,
          requestedAt: job.requestedAt,
        });
      }

      case 'audio.identify': {
        return audio.detectAudioFileMusic({
          db,
          env,
          fileId: job.fileId,
          isFinalAttempt,
          requestedAt: job.requestedAt,
        });
      }
    }
  };

export const processJob = createJobProcessor();
