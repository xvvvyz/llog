import * as auddParams from '@/api/audio-analysis/audd-params';
import { getAuddMusicTracks } from '@/api/audio-analysis/audd-tracks';
import type { AudioFile } from '@/api/audio-analysis/types';
import { getFileR2Url } from '@/api/files/r2-urls';
import { isRecord } from '@/lib/coerce';

const AUDD_ENTERPRISE_URL = 'https://enterprise.audd.io/';

const requireConfigValue = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const readResponseJson = async (response: Response) => {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const recognizeAudioFileMusicTracks = async ({
  env,
  file,
  url,
}: {
  env: CloudflareEnv;
  file: AudioFile;
  url?: string;
}) => {
  const audioUrl =
    url ??
    (file.assetKey ? getFileR2Url(file.assetKey, env.APP_URL) : undefined);

  if (!audioUrl) return [];
  const body = new FormData();

  body.append(
    'api_token',
    requireConfigValue(env.AUDD_API_KEY, 'AUDD_API_KEY')
  );

  body.append('url', audioUrl);
  body.append('accurate_offsets', 'true');
  body.append('every', auddParams.AUDD_SCAN_EVERY_CHUNKS.toString());
  body.append('skip', auddParams.AUDD_SCAN_SKIP_CHUNKS.toString());
  const response = await fetch(AUDD_ENTERPRISE_URL, { body, method: 'POST' });
  const responseBody = await readResponseJson(response);

  if (
    !response.ok ||
    !isRecord(responseBody) ||
    responseBody.status !== 'success'
  ) {
    throw new Error(
      `AudD music recognition failed: ${JSON.stringify({
        body: responseBody,
        status: response.status,
        statusText: response.statusText,
      })}`
    );
  }

  return getAuddMusicTracks(responseBody.result, {
    audioDurationMs: file.duration,
  });
};
