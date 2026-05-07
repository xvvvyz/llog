import type { AudioFile } from '@/api/audio-analysis/types';
import { asNumber, asString, isRecord } from '@/lib/coerce';

const OPENAI_STT_MODEL = 'gpt-4o-mini-transcribe';
const OPENAI_TRANSCRIPTION_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const MIN_AVERAGE_LOGPROB = -1.5;

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

const averageLogprob = (result: Record<string, unknown>) => {
  const logprobs = result.logprobs;
  if (!Array.isArray(logprobs) || logprobs.length === 0) return undefined;

  const values = logprobs
    .map((item) => (isRecord(item) ? asNumber(item.logprob) : undefined))
    .filter((value): value is number => value !== undefined);

  if (values.length === 0) return undefined;
  return values.reduce((total, value) => total + value, 0) / values.length;
};

const shouldKeepTranscript = ({
  result,
  text,
}: {
  result: Record<string, unknown>;
  text: string;
}) => {
  if (!/[\p{L}\p{N}]/u.test(text)) return false;
  const confidence = averageLogprob(result);
  return confidence === undefined || confidence >= MIN_AVERAGE_LOGPROB;
};

const uploadTooLargeError = () =>
  new Error(
    "The video's generated audio is larger than OpenAI's 25 MB transcription upload limit."
  );

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
  body.append('response_format', 'json');
  body.append('include[]', 'logprobs');
  body.append('chunking_strategy[type]', 'server_vad');
  body.append('chunking_strategy[prefix_padding_ms]', '300');
  body.append('chunking_strategy[silence_duration_ms]', '500');
  body.append('chunking_strategy[threshold]', '0.6');

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

  if (!isRecord(result)) return undefined;
  const text = asString(result.text);
  if (!text || !shouldKeepTranscript({ result, text })) return undefined;
  return text;
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
    contentLength > OPENAI_TRANSCRIPTION_UPLOAD_MAX_BYTES
  ) {
    throw uploadTooLargeError();
  }

  const bytes = await response.arrayBuffer();

  if (bytes.byteLength > OPENAI_TRANSCRIPTION_UPLOAD_MAX_BYTES) {
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
