import { recognizeAudioFileMusic } from '@/api/audio-analysis/audd-client';
import * as openai from '@/api/audio-analysis/openai';
import { updateAudioFile } from '@/api/audio-analysis/repository';
import * as audioSource from '@/api/audio-analysis/source';
import type * as audioAnalysisTypes from '@/api/audio-analysis/types';
import { type Db } from '@/api/middleware/db';
import * as audioAnalysis from '@/domain/files/audio-analysis';

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

export const transcribeAudioFile = async ({
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
      await updateAudioFile(db, file.id, { transcript: [] });
      return true;
    }

    if (audioAnalysis.isTranscriptionDurationTooLong(file.duration)) {
      return false;
    }

    if (
      file.type === 'audio' &&
      audioAnalysis.isTranscriptionUploadTooLarge(file.size)
    ) {
      return false;
    }

    await updateAudioFile(db, file.id, { isTranscribing: true });
    didStart = true;

    const sourceResult = await audioSource.resolveAudioAnalysisSource({
      env,
      file,
    });

    if (sourceResult.status === 'pending') {
      await updateAudioFile(db, file.id, { isTranscribing: false });
      return false;
    }

    const transcript = await transcribeAudioSource({
      env,
      source: sourceResult.source,
    });

    await updateAudioFile(db, file.id, { isTranscribing: false, transcript });
    return true;
  } catch (error) {
    if (didStart || file.type === 'video') {
      await updateAudioFile(db, file.id, {
        ...(didStart ? { isTranscribing: false } : {}),
        ...(file.type === 'video' ? { transcript: [] } : {}),
      });
    }

    throw error;
  }
};

export const detectAudioFileMusic = async ({
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

    await updateAudioFile(db, file.id, { isIdentifying: true });
    didStart = true;

    const sourceResult = await audioSource.resolveAudioAnalysisSource({
      env,
      file,
    });

    if (sourceResult.status === 'pending') {
      await clearIdentifying(db, file.id);
      return false;
    }

    const recognition = await recognizeAudioFileMusic({
      env,
      file,
      url: sourceResult.source.url,
    });

    await updateAudioFile(db, file.id, {
      audd: recognition.audd,
      isIdentifying: false,
      tracks: recognition.tracks,
    });

    return true;
  } catch (error) {
    if (didStart) await clearIdentifying(db, file.id);
    throw error;
  }
};
