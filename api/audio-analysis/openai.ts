import type { AudioFile } from '@/api/audio-analysis/types';
import { asNumber, asString, isRecord } from '@/lib/coerce';

const OPENAI_STT_MODEL = 'gpt-4o-mini-transcribe';
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

export const transcribeAudioFile = async ({
  env,
  file,
  object,
}: {
  env: CloudflareEnv;
  file: AudioFile;
  object: R2ObjectBody;
}) => {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required');

  const contentType =
    object.httpMetadata?.contentType || file.mimeType || 'audio/mp4';

  const body = new FormData();

  body.append(
    'file',
    new File(
      [await object.arrayBuffer()],
      getAudioFileName(file, contentType),
      { type: contentType }
    )
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
    throw new Error(`OpenAI transcript failed: ${JSON.stringify(result)}`);
  }

  if (!isRecord(result)) return undefined;
  const text = asString(result.text);
  if (!text || !shouldKeepTranscript({ result, text })) return undefined;
  return text;
};
