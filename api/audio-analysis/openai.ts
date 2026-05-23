import type { AudioFile, TranscriptSegment } from '@/api/audio-analysis/types';
import { requireEnvString } from '@/api/lib/env';
import * as audioAnalysis from '@/domain/files/audio-analysis';
import { asNumber, asString, isRecord } from '@/lib/coerce';
import { HTTPException } from 'hono/http-exception';
import OpenAI, { APIError } from 'openai';

const getAudioFileName = (file: AudioFile, contentType?: string | null) => {
  const value =
    `${file.mimeType ?? ''} ${contentType ?? ''} ${file.name ?? ''} ${
      file.assetKey ?? ''
    }`.toLowerCase();

  if (value.includes('webm')) return 'recording.webm';
  if (value.includes('mp3') || value.includes('mpeg')) return 'recording.mp3';
  if (value.includes('wav')) return 'recording.wav';
  if (value.includes('flac')) return 'recording.flac';
  if (value.includes('ogg')) return 'recording.ogg';
  if (value.includes('aac')) return 'recording.aac';
  return 'recording.m4a';
};

const uploadTooLargeError = () =>
  new HTTPException(413, {
    message:
      'The audio is larger than OpenAI’s 25 MB transcription upload limit.',
  });

const describeOpenAiError = (error: unknown) => {
  if (error instanceof APIError) return error.message;
  if (error instanceof Error) return error.message;
  return JSON.stringify(error);
};

const isOpenAiUploadSizeError = (error: unknown) => {
  if (error instanceof APIError && error.status === 413) return true;
  const value = describeOpenAiError(error).toLowerCase();

  return (
    value.includes('25 mb') ||
    value.includes('26214400') ||
    value.includes('maximum content size') ||
    (value.includes('larger') && value.includes('limit'))
  );
};

const parseContentLength = (response: Response) => {
  const value = response.headers.get('content-length');
  if (!value) return undefined;
  const length = Number(value);
  return Number.isFinite(length) && length >= 0 ? length : undefined;
};

const parseTranscriptSegments = (result: unknown): TranscriptSegment[] => {
  if (!isRecord(result) || !Array.isArray(result.segments)) return [];

  return result.segments
    .flatMap((segment): TranscriptSegment[] => {
      if (!isRecord(segment)) return [];
      const start = asNumber(segment.start);
      const end = asNumber(segment.end);
      const text = asString(segment.text);
      if (start == null || end == null || !text || end < start) return [];
      return [{ end, start, text }];
    })
    .sort((a, b) => a.start - b.start);
};

const shouldKeepTranscriptSegments = (segments: TranscriptSegment[]) =>
  segments.some((segment) => /[\p{L}\p{N}]/u.test(segment.text));

const transcribeAudioUpload = async ({
  env,
  failWithUploadLimitError,
  upload,
}: {
  env: CloudflareEnv;
  failWithUploadLimitError?: boolean;
  upload: { bytes: ArrayBuffer; contentType: string; fileName: string };
}) => {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required');
  const model = requireEnvString(env, 'OPENAI_STT_MODEL');
  const client = new OpenAI({ apiKey });

  try {
    const result = await client.audio.transcriptions.create({
      file: new File([upload.bytes], upload.fileName, {
        type: upload.contentType,
      }),
      model,
      response_format: 'verbose_json',
      temperature: 0,
      timestamp_granularities: ['segment'],
    });

    const segments = parseTranscriptSegments(result);
    return shouldKeepTranscriptSegments(segments) ? segments : [];
  } catch (error) {
    if (failWithUploadLimitError && isOpenAiUploadSizeError(error)) {
      throw uploadTooLargeError();
    }

    throw new Error(`OpenAI transcript failed: ${describeOpenAiError(error)}`);
  }
};

export const transcribeAudioFile = async ({
  env,
  file,
  object,
}: {
  env: CloudflareEnv;
  file: AudioFile;
  object: R2ObjectBody;
}) => {
  const contentType =
    object.httpMetadata?.contentType || file.mimeType || 'audio/mp4';

  if (audioAnalysis.isTranscriptionUploadTooLarge(object.size)) {
    throw uploadTooLargeError();
  }

  return transcribeAudioUpload({
    env,
    upload: {
      bytes: await object.arrayBuffer(),
      contentType,
      fileName: getAudioFileName(file, contentType),
    },
  });
};

export const transcribeAudioUrl = async ({
  contentType,
  env,
  fileName,
  url,
}: {
  contentType?: string;
  env: CloudflareEnv;
  fileName: string;
  url: string;
}) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Cloudflare Stream audio download failed (${response.status})`
    );
  }

  const contentLength = parseContentLength(response);

  if (
    contentLength != null &&
    contentLength > audioAnalysis.MAX_TRANSCRIPTION_UPLOAD_BYTES
  ) {
    throw uploadTooLargeError();
  }

  const bytes = await response.arrayBuffer();

  if (bytes.byteLength > audioAnalysis.MAX_TRANSCRIPTION_UPLOAD_BYTES) {
    throw uploadTooLargeError();
  }

  return transcribeAudioUpload({
    env,
    failWithUploadLimitError: true,
    upload: {
      bytes,
      contentType:
        response.headers.get('content-type') || contentType || 'audio/mp4',
      fileName,
    },
  });
};
