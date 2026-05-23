import { z } from 'zod/v4';

const schemaVersion = z.literal(1);
const requestedAt = z.string().datetime();

const cardGenerateJobSchema = z.object({
  cardId: z.string().min(1),
  requestedAt,
  schemaVersion,
  type: z.literal('card.generate'),
});

const cardRefreshJobSchema = z.object({
  cardId: z.string().min(1),
  requestedAt,
  schemaVersion,
  type: z.literal('card.refresh'),
});

const cardTweakJobSchema = z.object({
  cardId: z.string().min(1),
  requestedAt,
  schemaVersion,
  tweakPrompt: z.string().min(1),
  type: z.literal('card.tweak'),
});

const analysisExtractJobSchema = z.object({
  analysisId: z.string().min(1),
  cardId: z.string().min(1),
  chunkIndex: z.number().int().min(0),
  requestedAt,
  schemaVersion,
  type: z.literal('analysis.extract'),
});

const analysisFinalizeJobSchema = z.object({
  analysisId: z.string().min(1),
  cardId: z.string().min(1),
  requestedAt,
  schemaVersion,
  type: z.literal('analysis.finalize'),
});

const audioTranscribeJobSchema = z.object({
  fileId: z.string().min(1),
  requestedAt,
  schemaVersion,
  type: z.literal('audio.transcribe'),
});

const audioIdentifyJobSchema = z.object({
  fileId: z.string().min(1),
  requestedAt,
  schemaVersion,
  type: z.literal('audio.identify'),
});

export const jobSchema = z.discriminatedUnion('type', [
  analysisExtractJobSchema,
  analysisFinalizeJobSchema,
  cardGenerateJobSchema,
  cardRefreshJobSchema,
  cardTweakJobSchema,
  audioTranscribeJobSchema,
  audioIdentifyJobSchema,
]);

export type Job = z.infer<typeof jobSchema>;

export const parseJob = (value: unknown) => jobSchema.parse(value);

export const enqueueJob = (
  env: Pick<CloudflareEnv, 'JOBS_QUEUE'>,
  job: Job,
  options?: QueueSendOptions
) => env.JOBS_QUEUE.send(job, { contentType: 'json', ...options });
