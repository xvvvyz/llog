import type { AudioAnalysisJob } from '@/api/audio-analysis/types';

export const enqueueAudioAnalysis = async ({
  env,
  fileId,
  origin,
}: {
  env: CloudflareEnv;
  fileId: string;
  origin: AudioAnalysisJob['origin'];
}) => {
  await env.AUDIO_ANALYSIS_QUEUE.send({ fileId, origin });
};
