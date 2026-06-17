import { Context } from 'hono';

const API_BASE = 'https://api.cloudflare.com/client/v4';
type StreamDownloadStatus = 'error' | 'inprogress' | 'ready';

type StreamDownload = {
  percentComplete?: number;
  status?: StreamDownloadStatus;
  url?: string;
};

type StreamDownloads = { audio?: StreamDownload; default?: StreamDownload };

export type StreamAudioDownload =
  | { status: 'error' | 'inprogress' }
  | { status: 'ready'; url: string };

const getConfig = (env: CloudflareEnv) => {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_STREAM_API_TOKEN) {
    throw new Error('Cloudflare Stream is not configured');
  }

  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_STREAM_API_TOKEN,
  };
};

const readApiError = async (response: Response) => {
  let text = '';

  try {
    text = await response.text();
  } catch {
    text = '';
  }

  try {
    const parsed = JSON.parse(text);
    const first = parsed?.errors?.[0];
    if (typeof first?.message === 'string') return first.message;
    if (typeof parsed?.message === 'string') return parsed.message;
  } catch {
    // noop
  }

  return text || `Cloudflare Stream request failed (${response.status})`;
};

const streamFetch = async <T>(
  env: CloudflareEnv,
  path: string,
  init: RequestInit = {},
  options: { ignoreNotFound?: boolean } = {}
) => {
  const { accountId, apiToken } = getConfig(env);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${apiToken}`);

  if (!headers.has('Content-Type') && init.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}/accounts/${accountId}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 404 && options.ignoreNotFound) return null as T;
  if (!response.ok) throw new Error(await readApiError(response));
  if (response.status === 204) return null as T;
  // Some endpoints (e.g. DELETE) return an empty body; don't choke on it.
  const text = await response.text();
  if (!text) return null as T;
  const body = JSON.parse(text) as { result: T };
  return body.result;
};

const encodeStreamUploadMetadata = (
  entries: Record<string, string | undefined>
) =>
  Object.entries(entries)
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([key, value]) => `${key} ${btoa(value)}`)
    .join(',');

// Creates a resumable (tus) direct creator upload. Unlike the basic
// `direct_upload` flow (capped at 200MB and uploaded in a single request), the
// returned URL is a tus endpoint the client PATCHes in chunks, so large videos
// never have to be held in memory in one piece.
export const createTusDirectVideoUpload = async (
  env: CloudflareEnv,
  options: {
    creator?: string;
    maxDurationSeconds: number;
    uploadLength: number;
  }
) => {
  const { accountId, apiToken } = getConfig(env);

  const metadata = encodeStreamUploadMetadata({
    creator: options.creator,
    maxDurationSeconds: String(options.maxDurationSeconds),
  });

  const response = await fetch(
    `${API_BASE}/accounts/${accountId}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(options.uploadLength),
        ...(metadata ? { 'Upload-Metadata': metadata } : {}),
      },
    }
  );

  if (!response.ok) throw new Error(await readApiError(response));
  const uploadURL = response.headers.get('Location');
  const uid = response.headers.get('stream-media-id');

  if (!uploadURL || !uid) {
    throw new Error('Cloudflare Stream did not return a tus upload URL');
  }

  return { uid, uploadURL };
};

export const deleteStreamVideo = async (env: CloudflareEnv, uid: string) => {
  await streamFetch(
    env,
    `/stream/${uid}`,
    { method: 'DELETE' },
    { ignoreNotFound: true }
  );
};

const getAudioDownload = (
  result?: StreamDownload | StreamDownloads | null
): StreamDownload | undefined => {
  if (!result) return undefined;
  if ('audio' in result || 'default' in result) return result.audio;
  return result as StreamDownload;
};

const normalizeAudioDownload = (
  download?: StreamDownload
): StreamAudioDownload => {
  if (!download) return { status: 'inprogress' };
  if (download.status === 'error') return { status: 'error' };

  if (download.status === 'ready') {
    if (!download.url) {
      throw new Error('Cloudflare Stream audio download is missing a URL');
    }

    return { status: 'ready', url: download.url };
  }

  return { status: 'inprogress' };
};

export const requestStreamAudioDownload = async (
  env: CloudflareEnv,
  uid: string
) => {
  const result = await streamFetch<StreamDownload | StreamDownloads>(
    env,
    `/stream/${uid}/downloads/audio`,
    { method: 'POST' }
  );

  return normalizeAudioDownload(getAudioDownload(result));
};

export const getStreamDownloads = (env: CloudflareEnv, uid: string) =>
  streamFetch<StreamDownloads>(env, `/stream/${uid}/downloads`);

export const resolveStreamAudioDownload = async (
  env: CloudflareEnv,
  uid: string
): Promise<StreamAudioDownload> => {
  const existing = normalizeAudioDownload(
    getAudioDownload(await getStreamDownloads(env, uid))
  );

  if (existing.status !== 'inprogress') return existing;
  return requestStreamAudioDownload(env, uid);
};

const parseWebhookSignature = (header: string) => {
  const parts = header.split(',');
  let time = '';
  let sig = '';

  for (const part of parts) {
    const [key, value] = part.split('=', 2);
    if (key === 'time') time = value ?? '';
    if (key === 'sig1') sig = value ?? '';
  }

  return { sig, time };
};

const bytesToHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const verifyStreamWebhook = async (
  c: Context<{ Bindings: CloudflareEnv }>,
  body: string
) => {
  const header = c.req.header('Webhook-Signature') ?? '';
  const secret = c.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (!header || !secret) return false;
  const { sig, time } = parseWebhookSignature(header);
  if (!sig || !time) return false;
  const timestamp = Number(time);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 5 * 60) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${time}.${body}`)
  );

  return bytesToHex(signature) === sig;
};
