import type { AudioFile, TranscriptSegment } from '@/api/audio-analysis/types';
import * as audioAnalysis from '@/domain/files/audio-analysis';
import { asNumber, asString, isRecord } from '@/lib/coerce';
import { HTTPException } from 'hono/http-exception';

const OPENAI_STT_MODEL = 'whisper-1';

const readResponseJson = async (response: Response) => {
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as unknown;
};

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
      "The audio is larger than OpenAI's 25 MB transcription upload limit.",
  });

const isOpenAiUploadSizeError = (result: unknown) => {
  const value = JSON.stringify(result ?? '').toLowerCase();

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
  const body = new FormData();

  body.append(
    'file',
    new File([upload.bytes], upload.fileName, { type: upload.contentType })
  );

  body.append('model', OPENAI_STT_MODEL);
  body.append('temperature', '0');
  body.append('response_format', 'verbose_json');
  body.append('timestamp_granularities[]', 'segment');

  const response = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    { body, headers: { Authorization: `Bearer ${apiKey}` }, method: 'POST' }
  );

  const result = await readResponseJson(response);

  if (!response.ok) {
    if (failWithUploadLimitError && isOpenAiUploadSizeError(result)) {
      throw uploadTooLargeError();
    }

    throw new Error(`OpenAI transcript failed: ${JSON.stringify(result)}`);
  }

  const segments = parseTranscriptSegments(result);
  return shouldKeepTranscriptSegments(segments) ? segments : [];
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
