import { recognizeAudioFileMusic } from '@/api/audio-analysis/audd-client';
import * as openai from '@/api/audio-analysis/openai';
import { getAudioFile, updateAudioFile } from '@/api/audio-analysis/repository';
import * as audioSource from '@/api/audio-analysis/source';
import type * as audioAnalysisTypes from '@/api/audio-analysis/types';
import { type Db } from '@/api/middleware/db';
import * as audioAnalysis from '@/domain/files/audio-analysis';

export const AUDIO_STREAM_PENDING_RETRY_DELAY_SECONDS = 60;

export const AUDIO_ANALYSIS_FAILURE_RETRY_DELAY_SECONDS = 60;

const isTooShortForAnalysis = (file: audioAnalysisTypes.AudioFile) =>
  audioAnalysis.isAudioAnalysisDurationTooShort(file.duration);

const timeValue = (value?: Date | number | string | null) => {
  if (value == null) return;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : undefined;
};

const isSameRequest = (
  requestDate: Date | number | string | null | undefined,
  requestedAt: string
) => timeValue(requestDate) === timeValue(requestedAt);

const updateAudioFileIfCurrentRequest = async ({
  db,
  fields,
  fileId,
  requestField,
  requestedAt,
}: {
  db: Db;
  fields: Record<string, unknown>;
  fileId: string;
  requestField: 'identificationRequestedAt' | 'transcriptionRequestedAt';
  requestedAt: string;
}) => {
  const file = await getAudioFile(db, fileId);
  if (!isSameRequest(file?.[requestField], requestedAt)) return false;
  await updateAudioFile(db, fileId, fields);
  return true;
};

type CurrentAudioRequestUpdate = {
  db: Db;
  fields?: Record<string, unknown>;
  fileId: string;
  requestedAt: string;
};

const clearTranscriptionRequest = (params: CurrentAudioRequestUpdate) =>
  updateAudioFileIfCurrentRequest({
    ...params,
    fields: {
      isTranscribing: false,
      transcriptionRequestedAt: null,
      ...params.fields,
    },
    requestField: 'transcriptionRequestedAt',
  });

const clearIdentificationRequest = (params: CurrentAudioRequestUpdate) =>
  updateAudioFileIfCurrentRequest({
    ...params,
    fields: {
      identificationRequestedAt: null,
      isIdentifying: false,
      ...params.fields,
    },
    requestField: 'identificationRequestedAt',
  });

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
  fileId,
  isFinalAttempt,
  requestedAt,
}: {
  db: Db;
  env: CloudflareEnv;
  fileId: string;
  isFinalAttempt?: boolean;
  requestedAt: string;
}) => {
  const file = await getAudioFile(db, fileId);

  if (
    !audioSource.hasAudioAnalysisAssetFile(file) ||
    file.transcript != null ||
    !file.isTranscribing ||
    !isSameRequest(file.transcriptionRequestedAt, requestedAt)
  ) {
    await clearTranscriptionRequest({ db, fileId, requestedAt });
    return false;
  }

  try {
    if (isTooShortForAnalysis(file)) {
      await clearTranscriptionRequest({
        db,
        fields: { transcript: [] },
        fileId,
        requestedAt,
      });

      return true;
    }

    if (audioAnalysis.isTranscriptionDurationTooLong(file.duration)) {
      await clearTranscriptionRequest({ db, fileId, requestedAt });
      return false;
    }

    if (
      file.type === 'audio' &&
      audioAnalysis.isTranscriptionUploadTooLarge(file.size)
    ) {
      await clearTranscriptionRequest({ db, fileId, requestedAt });
      return false;
    }

    const sourceResult = await audioSource.resolveAudioAnalysisSource({
      env,
      file,
    });

    if (sourceResult.status === 'pending') {
      if (isFinalAttempt) {
        await clearTranscriptionRequest({ db, fileId, requestedAt });
        return { success: false };
      }

      return {
        retryAfterSeconds: AUDIO_STREAM_PENDING_RETRY_DELAY_SECONDS,
        success: false,
      };
    }

    const transcript = await transcribeAudioSource({
      env,
      source: sourceResult.source,
    });

    const didWrite = await clearTranscriptionRequest({
      db,
      fields: { transcript },
      fileId,
      requestedAt,
    });

    return { success: didWrite };
  } catch (error) {
    console.error('Audio transcription failed', { error, fileId });

    if (isFinalAttempt) {
      await clearTranscriptionRequest({ db, fileId, requestedAt });
      return { success: false };
    }

    return {
      retryAfterSeconds: AUDIO_ANALYSIS_FAILURE_RETRY_DELAY_SECONDS,
      success: false,
    };
  }
};

export const detectAudioFileMusic = async ({
  db,
  env,
  fileId,
  isFinalAttempt,
  requestedAt,
}: {
  db: Db;
  env: CloudflareEnv;
  fileId: string;
  isFinalAttempt?: boolean;
  requestedAt: string;
}) => {
  const file = await getAudioFile(db, fileId);

  if (
    !audioSource.hasAudioAnalysisAssetFile(file) ||
    file.tracks != null ||
    !file.isIdentifying ||
    !isSameRequest(file.identificationRequestedAt, requestedAt)
  ) {
    await clearIdentificationRequest({ db, fileId, requestedAt });
    return false;
  }

  try {
    if (isTooShortForAnalysis(file)) {
      await clearIdentificationRequest({
        db,
        fields: { tracks: [] },
        fileId,
        requestedAt,
      });

      return true;
    }

    const sourceResult = await audioSource.resolveAudioAnalysisSource({
      env,
      file,
    });

    if (sourceResult.status === 'pending') {
      if (isFinalAttempt) {
        await clearIdentificationRequest({ db, fileId, requestedAt });
        return { success: false };
      }

      return {
        retryAfterSeconds: AUDIO_STREAM_PENDING_RETRY_DELAY_SECONDS,
        success: false,
      };
    }

    const recognition = await recognizeAudioFileMusic({
      env,
      file,
      url: sourceResult.source.url,
    });

    const didWrite = await clearIdentificationRequest({
      db,
      fields: { audd: recognition.audd, tracks: recognition.tracks },
      fileId,
      requestedAt,
    });

    return { success: didWrite };
  } catch (error) {
    console.error('Audio identification failed', { error, fileId });

    if (isFinalAttempt) {
      await clearIdentificationRequest({ db, fileId, requestedAt });
      return { success: false };
    }

    return {
      retryAfterSeconds: AUDIO_ANALYSIS_FAILURE_RETRY_DELAY_SECONDS,
      success: false,
    };
  }
};
