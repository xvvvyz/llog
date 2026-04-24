import { Context } from 'hono';

const API_BASE = 'https://api.cloudflare.com/client/v4';

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
  init: RequestInit = {}
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

  if (!response.ok) throw new Error(await readApiError(response));
  if (response.status === 204) return null as T;
  const body = (await response.json()) as { result: T };
  return body.result;
};

export const createDirectVideoUpload = async (
  env: CloudflareEnv,
  options: { creator?: string; maxDurationSeconds?: number } = {}
) => {
  const result = await streamFetch<{ uid?: string; uploadURL?: string }>(
    env,
    '/stream/direct_upload',
    {
      body: JSON.stringify({
        ...(options.creator ? { creator: options.creator } : {}),
        ...(options.maxDurationSeconds != null
          ? { maxDurationSeconds: options.maxDurationSeconds }
          : {}),
      }),
      method: 'POST',
    }
  );

  const uid = result?.uid;
  const uploadURL = result?.uploadURL;

  if (!uid || !uploadURL) {
    throw new Error('Cloudflare Stream did not return a direct upload URL');
  }

  return { uid, uploadURL };
};

export const deleteStreamVideo = async (env: CloudflareEnv, uid: string) => {
  await streamFetch(env, `/stream/${uid}`, { method: 'DELETE' });
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
