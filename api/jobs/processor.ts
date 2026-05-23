import * as audioAnalysis from '@/api/audio-analysis/processor';
import * as cardActions from '@/api/cards/card-actions';
import { parseJob, type Job } from '@/api/jobs/payload';
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
  extractCardAnalysisChunk: (
    input: Parameters<typeof cardActions.extractCardAnalysisChunk>[0]
  ) => Promise<JobResult | boolean>;
  finalizeCardAnalysis: (
    input: Parameters<typeof cardActions.finalizeCardAnalysis>[0]
  ) => Promise<JobResult | boolean>;
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
      case 'analysis.extract': {
        return cards.extractCardAnalysisChunk({
          analysisId: job.analysisId,
          cardId: job.cardId,
          chunkIndex: job.chunkIndex,
          dbClient: db,
          env,
          isFinalAttempt,
          requestedAt: job.requestedAt,
        });
      }

      case 'analysis.finalize': {
        return cards.finalizeCardAnalysis({
          analysisId: job.analysisId,
          cardId: job.cardId,
          dbClient: db,
          env,
          isFinalAttempt,
          requestedAt: job.requestedAt,
        });
      }

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

type QueueProcessor = typeof processJob;

export const processQueueMessage = async ({
  db,
  env,
  maxDeliveryAttempts,
  message,
  processor = processJob,
}: {
  db: Db;
  env: CloudflareEnv;
  maxDeliveryAttempts: number;
  message: Message<unknown>;
  processor?: QueueProcessor;
}) => {
  const isFinalAttempt = message.attempts >= maxDeliveryAttempts;

  try {
    const job = parseJob(message.body);
    const result = await processor({ db, env, isFinalAttempt, job });
    const retryDelay = getJobRetryDelay(result);

    if (retryDelay != null && !isFinalAttempt) {
      message.retry({ delaySeconds: retryDelay });
      return;
    }

    message.ack();
  } catch (error) {
    console.error('Queue job failed', {
      attempts: message.attempts,
      error,
      isFinalAttempt,
      messageId: message.id,
    });

    if (isFinalAttempt) {
      message.ack();
      return;
    }

    message.retry();
  }
};

export const processQueueBatch = async ({
  batch,
  db,
  env,
  maxDeliveryAttempts,
  processor,
}: {
  batch: MessageBatch<unknown>;
  db: Db;
  env: CloudflareEnv;
  maxDeliveryAttempts: number;
  processor?: QueueProcessor;
}) => {
  await Promise.all(
    batch.messages.map((message) =>
      processQueueMessage({ db, env, maxDeliveryAttempts, message, processor })
    )
  );
};
