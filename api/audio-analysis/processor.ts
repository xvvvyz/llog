import { recognizeAudioFileMusicTracks } from '@/api/audio-analysis/audd-client';
import * as openai from '@/api/audio-analysis/openai';
import { updateAudioFile } from '@/api/audio-analysis/repository';
import * as audioSource from '@/api/audio-analysis/source';
import type * as audioAnalysisTypes from '@/api/audio-analysis/types';
import { type Db } from '@/api/middleware/db';
import { isTranscriptionDurationTooLong } from '@/domain/files/audio-analysis';

const MIN_AUDIO_ANALYSIS_DURATION_MS = 2000;

const isTooShortForAnalysis = (file: audioAnalysisTypes.AudioFile) =>
  typeof file.duration === 'number' &&
  Number.isFinite(file.duration) &&
  file.duration < MIN_AUDIO_ANALYSIS_DURATION_MS;

const clearIdentifying = (db: Db, fileId: string) =>
  updateAudioFile(db, fileId, { isIdentifying: false });

const transcribeAudioSource = async ({
  env,
  source,
}: {
  env: CloudflareEnv;
  source: audioSource.AudioAnalysisSource;
}) => {
  if (source.kind === 'stream') {
    return openai.transcribeAudioUrl({
      contentType: source.contentType,
      env,
      fileName: source.fileName,
      url: source.url,
    });
  }

  const object = await env.R2.get(source.assetKey);
  if (!object) throw new Error('Audio file not found in R2');
  return openai.transcribeAudioFile({ env, file: source.file, object });
};

export const transcribeAudioFileTranscript = async ({
  db,
  env,
  file,
}: {
  db: Db;
  env: CloudflareEnv;
  file?: audioAnalysisTypes.AudioFile;
}) => {
  if (
    !audioSource.hasAudioAnalysisAssetFile(file) ||
    file.transcript != null ||
    file.isTranscribing
  ) {
    return false;
  }

  let didStart = false;

  try {
    if (isTooShortForAnalysis(file)) {
      await updateAudioFile(db, file.id, { transcript: '' });
      return true;
    }

    if (isTranscriptionDurationTooLong(file.duration)) return false;

    const sourceResult = await audioSource.resolveAudioAnalysisSource({
      env,
      file,
    });

    if (sourceResult.status === 'pending') return false;
    await updateAudioFile(db, file.id, { isTranscribing: true });
    didStart = true;

    const transcript = await transcribeAudioSource({
      env,
      source: sourceResult.source,
    });

    await updateAudioFile(db, file.id, {
      isTranscribing: false,
      transcript: transcript ?? '',
    });

    return true;
  } catch (error) {
    if (didStart || file.type === 'video') {
      await updateAudioFile(db, file.id, {
        ...(didStart ? { isTranscribing: false } : {}),
        ...(file.type === 'video' ? { transcript: '' } : {}),
      });
    }

    throw error;
  }
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
  if (
    !audioSource.hasAudioAnalysisAssetFile(file) ||
    file.tracks != null ||
    file.isIdentifying
  ) {
    return false;
  }

  let didStart = false;

  try {
    if (isTooShortForAnalysis(file)) {
      await updateAudioFile(db, file.id, { tracks: [] });
      return true;
    }

    const sourceResult = await audioSource.resolveAudioAnalysisSource({
      env,
      file,
    });

    if (sourceResult.status === 'pending') return false;
    await updateAudioFile(db, file.id, { isIdentifying: true });
    didStart = true;

    const tracks = await recognizeAudioFileMusicTracks({
      env,
      file,
      url: sourceResult.source.url,
    });

    await updateAudioFile(db, file.id, { isIdentifying: false, tracks });
    return true;
  } catch (error) {
    if (didStart) await clearIdentifying(db, file.id);
    throw error;
  }
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
