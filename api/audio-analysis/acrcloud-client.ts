import type { AudioFile, MusicTrack } from '@/api/audio-analysis/types';
import { getFileR2Url } from '@/api/files/r2-urls';
import { asId, isRecord } from '@/lib/coerce';

const ACRCLOUD_METADATA_TRACKS_URL =
  'https://eu-api-v2.acrcloud.com/api/external-metadata/tracks';

const requireConfigValue = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const readResponseJson = async (response: Response) => {
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as unknown;
};

const normalizeId = (value: unknown) => asId(value)?.toLocaleLowerCase();

export const submitAudioFileForMusicScan = async ({
  env,
  file,
}: {
  env: CloudflareEnv;
  file: AudioFile;
}) => {
  if (!file.assetKey) return;
  const body = new FormData();
  body.append('data_type', 'audio_url');
  body.append('url', getFileR2Url(file.assetKey, env.APP_URL));
  body.append('name', file.id);

  const response = await fetch(getAcrCloudFilesUrl(env), {
    body,
    headers: {
      Authorization: `Bearer ${requireConfigValue(
        env.ACRCLOUD_CONSOLE_TOKEN,
        'ACRCLOUD_CONSOLE_TOKEN'
      )}`,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(
      `ACRCloud file submission failed: ${JSON.stringify(await readResponseJson(response))}`
    );
  }
};

export const getAcrCloudMetadataTrack = async (
  env: CloudflareEnv,
  track: Pick<MusicTrack, 'acrid' | 'artists' | 'isrc' | 'title'>
) => {
  const url = new URL(ACRCLOUD_METADATA_TRACKS_URL);

  if (track.isrc) url.searchParams.set('isrc', track.isrc);
  else if (track.acrid) url.searchParams.set('acr_id', track.acrid);
  else if (track.artists.length) {
    url.searchParams.set(
      'query',
      JSON.stringify({ artists: track.artists, track: track.title })
    );

    url.searchParams.set('format', 'json');
  } else return;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${requireConfigValue(
        env.ACRCLOUD_CONSOLE_TOKEN,
        'ACRCLOUD_CONSOLE_TOKEN'
      )}`,
    },
  });

  const body = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(`ACRCloud metadata failed: ${JSON.stringify(body)}`);
  }

  const data =
    isRecord(body) && Array.isArray(body.data)
      ? body.data.filter(isRecord)
      : [];

  if (!data.length) return;

  return (
    data.find((item) => normalizeId(item.isrc) === normalizeId(track.isrc)) ??
    data[0]
  );
};

const getAcrCloudFilesUrl = (env: CloudflareEnv) =>
  `https://api-${requireConfigValue(
    env.ACRCLOUD_REGION,
    'ACRCLOUD_REGION'
  )}.acrcloud.com/api/fs-containers/${encodeURIComponent(
    requireConfigValue(
      env.ACRCLOUD_MUSIC_CONTAINER_ID,
      'ACRCLOUD_MUSIC_CONTAINER_ID'
    )
  )}/files`;

export const deleteAcrCloudFile = async (
  env: CloudflareEnv,
  acrCloudFileId: string
) => {
  const response = await fetch(
    `${getAcrCloudFilesUrl(env)}/${encodeURIComponent(acrCloudFileId)}`,
    {
      headers: {
        Authorization: `Bearer ${requireConfigValue(
          env.ACRCLOUD_CONSOLE_TOKEN,
          'ACRCLOUD_CONSOLE_TOKEN'
        )}`,
      },
      method: 'DELETE',
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `ACRCloud file delete failed: ${JSON.stringify(await readResponseJson(response))}`
    );
  }
};
