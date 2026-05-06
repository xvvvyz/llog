import { recognizeAudioFileMusicTracks } from '@/api/audio-analysis/audd-client';
import { transcribeAudioFile } from '@/api/audio-analysis/openai';
import { getAudioFile, updateAudioFile } from '@/api/audio-analysis/repository';
import type * as audioAnalysisTypes from '@/api/audio-analysis/types';
import { createAdminDb, type Db } from '@/api/middleware/db';

const MIN_AUDIO_ANALYSIS_DURATION_MS = 2000;

export const handleAudioAnalysisBatch = async (
  batch: MessageBatch<audioAnalysisTypes.AudioAnalysisJob>,
  env: CloudflareEnv
) => {
  for (const message of batch.messages) {
    try {
      await processAudio(message.body, env);
      message.ack();
    } catch (error) {
      console.error('Audio analysis failed', {
        error,
        fileId: message.body.fileId,
      });

      message.retry();
    }
  }
};

const processAudio = async (
  job: audioAnalysisTypes.AudioAnalysisJob,
  env: CloudflareEnv
) => {
  const db = createAdminDb(env);
  const file = await getAudioFile(db, job.fileId);
  if (!file?.id || file.type !== 'audio' || !file.assetKey) return;

  if (
    typeof file.duration === 'number' &&
    Number.isFinite(file.duration) &&
    file.duration < MIN_AUDIO_ANALYSIS_DURATION_MS
  ) {
    return;
  }

  if (job.origin === 'recorded') await transcribeRecordedAudio(db, env, file);
  else await scanUploadedAudio(db, env, file);
};

const transcribeRecordedAudio = async (
  db: Db,
  env: CloudflareEnv,
  file: audioAnalysisTypes.AudioFile
) => {
  if (file.transcript || !file.assetKey) return;
  const object = await env.R2.get(file.assetKey);
  if (!object) throw new Error('Audio file not found in R2');
  const transcript = await transcribeAudioFile({ env, file, object });
  if (!transcript) return;
  await updateAudioFile(db, file.id, { transcript });
};

const scanUploadedAudio = async (
  db: Db,
  env: CloudflareEnv,
  file: audioAnalysisTypes.AudioFile
) => {
  if (file.tracks != null || !file.assetKey) return;
  const tracks = await recognizeAudioFileMusicTracks({ env, file });
  await updateAudioFile(db, file.id, { tracks });
};
