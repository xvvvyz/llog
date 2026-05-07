import { recognizeAudioFileMusicTracks } from '@/api/audio-analysis/audd-client';
import { transcribeAudioFile } from '@/api/audio-analysis/openai';
import { updateAudioFile } from '@/api/audio-analysis/repository';
import type * as audioAnalysisTypes from '@/api/audio-analysis/types';
import { type Db } from '@/api/middleware/db';

const MIN_AUDIO_ANALYSIS_DURATION_MS = 2000;

type AudioAssetFile = audioAnalysisTypes.AudioFile & {
  assetKey: string;
  type: 'audio';
};

const hasAudioAssetFile = (
  file?: audioAnalysisTypes.AudioFile
): file is AudioAssetFile =>
  !!file?.id && file.type === 'audio' && !!file.assetKey;

const isTooShortForAnalysis = (file: audioAnalysisTypes.AudioFile) =>
  typeof file.duration === 'number' &&
  Number.isFinite(file.duration) &&
  file.duration < MIN_AUDIO_ANALYSIS_DURATION_MS;

export const transcribeAudioFileTranscript = async ({
  db,
  env,
  file,
}: {
  db: Db;
  env: CloudflareEnv;
  file?: audioAnalysisTypes.AudioFile;
}) => {
  if (!hasAudioAssetFile(file) || file.transcript != null) return false;

  if (isTooShortForAnalysis(file)) {
    await updateAudioFile(db, file.id, { transcript: '' });
    return true;
  }

  const object = await env.R2.get(file.assetKey);
  if (!object) throw new Error('Audio file not found in R2');
  const transcript = await transcribeAudioFile({ env, file, object });
  await updateAudioFile(db, file.id, { transcript: transcript ?? '' });
  return true;
};

export const transcribeAudioFiles = async ({
  db,
  env,
  files,
}: {
  db: Db;
  env: CloudflareEnv;
  files: audioAnalysisTypes.AudioFile[];
}) => {
  let updated = 0;

  for (const file of files) {
    if (await transcribeAudioFileTranscript({ db, env, file })) updated += 1;
  }

  return { updated };
};

export const detectAudioFileMusicTracks = async ({
  db,
  env,
  file,
}: {
  db: Db;
  env: CloudflareEnv;
  file?: audioAnalysisTypes.AudioFile;
}) => {
  if (!hasAudioAssetFile(file) || file.tracks != null) return false;

  if (isTooShortForAnalysis(file)) {
    await updateAudioFile(db, file.id, { tracks: [] });
    return true;
  }

  const tracks = await recognizeAudioFileMusicTracks({ env, file });
  await updateAudioFile(db, file.id, { tracks });
  return true;
};

export const detectAudioFilesMusicTracks = async ({
  db,
  env,
  files,
}: {
  db: Db;
  env: CloudflareEnv;
  files: audioAnalysisTypes.AudioFile[];
}) => {
  let updated = 0;

  for (const file of files) {
    if (await detectAudioFileMusicTracks({ db, env, file })) updated += 1;
  }

  return { updated };
};
