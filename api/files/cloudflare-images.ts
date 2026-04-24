const API_BASE = 'https://api.cloudflare.com/client/v4';
const STORED_IMAGE_URL_PREFIX = 'cf-image:';

const getConfig = (env: CloudflareEnv) => {
  const apiToken =
    env.CLOUDFLARE_IMAGES_API_TOKEN ?? env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!env.CLOUDFLARE_ACCOUNT_ID || !apiToken) {
    throw new Error('Cloudflare Images is not configured');
  }

  return { accountId: env.CLOUDFLARE_ACCOUNT_ID, apiToken };
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

  return text || `Cloudflare Images request failed (${response.status})`;
};

const imagesFetch = async <T>(
  env: CloudflareEnv,
  path: string,
  init: RequestInit = {}
) => {
  const { accountId, apiToken } = getConfig(env);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${apiToken}`);

  const response = await fetch(`${API_BASE}/accounts/${accountId}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) throw new Error(await readApiError(response));
  if (response.status === 204) return null as T;
  const body = (await response.json()) as { result: T };
  return body.result;
};

const getDeliveryUrlFromVariants = (variants?: string[]) =>
  variants?.find((variant) => /\/public(?:[/?]|$)/.test(variant)) ??
  variants?.[0] ??
  null;

export const storeImageDeliveryUrl = (url: string) =>
  `${STORED_IMAGE_URL_PREFIX}${url}`;

export const getStoredImageDeliveryUrl = (value?: string | null) =>
  value?.startsWith(STORED_IMAGE_URL_PREFIX)
    ? value.slice(STORED_IMAGE_URL_PREFIX.length)
    : null;

export const getImageIdFromDeliveryUrl = (uri: string) => {
  const url = new URL(uri);
  const parts = url.pathname.split('/').filter(Boolean);
  if (url.hostname.endsWith('imagedelivery.net')) return parts[1] ?? null;

  if (parts[0] === 'cdn-cgi' && parts[1] === 'imagedelivery') {
    return parts[3] ?? null;
  }

  return null;
};

export const uploadImage = async ({
  creator,
  env,
  file,
}: {
  creator?: string;
  env: CloudflareEnv;
  file: File;
}) => {
  const form = new FormData();
  form.set('file', file);
  if (creator) form.set('creator', creator);
  form.set('requireSignedURLs', 'false');

  const result = await imagesFetch<{ id?: string; variants?: string[] }>(
    env,
    '/images/v1',
    { body: form, method: 'POST' }
  );

  const deliveryUrl = getDeliveryUrlFromVariants(result?.variants);

  if (!result?.id || !deliveryUrl) {
    throw new Error('Cloudflare Images did not return an image delivery URL');
  }

  return { deliveryUrl, id: result.id };
};

export const deleteImage = async (
  env: CloudflareEnv,
  storedUrl?: string | null
) => {
  const deliveryUrl = getStoredImageDeliveryUrl(storedUrl);
  if (!deliveryUrl) return;
  const imageId = getImageIdFromDeliveryUrl(deliveryUrl);
  if (!imageId) throw new Error('Invalid Cloudflare Images delivery URL');
  await imagesFetch(env, `/images/v1/${imageId}`, { method: 'DELETE' });
};
