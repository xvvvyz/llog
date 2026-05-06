import { db, type Db } from '@/api/middleware/db';
import { asString, isRecord } from '@/lib/coerce';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const LOCK_SCREEN_ARTWORK_DIMENSION = 512;
const LOCK_SCREEN_ARTWORK_QUALITY = 80;

const TRACK_ARTWORK_CACHE_CONTROL =
  'public, max-age=604800, s-maxage=31536000, immutable';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const parseInteger = (value?: string | null) => {
  const text = value?.trim();
  if (!text || !/^\d+$/.test(text)) return;
  const parsed = Number.parseInt(text, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

const parseTrackIndex = (value?: string) => {
  const index = parseInteger(value);

  if (index == null || index < 0) {
    throw new HTTPException(400, { message: 'Invalid track index' });
  }

  return index;
};

const getArtworkSourceUrl = (value: unknown) => {
  const directUrl = asString(value);
  if (directUrl) return directUrl;
  if (!isRecord(value)) return;

  return (
    asString(value.original) ??
    asString(value.large) ??
    asString(value.medium) ??
    asString(value.small)
  );
};

const getHttpUrl = (value?: string) => {
  if (!value) return;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    return url;
  } catch {
    return;
  }
};

const getHexDigest = async (value: string) => {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );

  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const getTrackArtworkUrl = async ({
  dbClient,
  fileId,
  trackIndex,
}: {
  dbClient: Db;
  fileId?: string;
  trackIndex: number;
}) => {
  if (!fileId) throw new HTTPException(400, { message: 'Invalid file' });

  const { files } = await dbClient.query({
    files: { $: { fields: ['id', 'tracks'], where: { id: fileId } } },
  });

  const tracks = files[0]?.tracks;

  if (!Array.isArray(tracks)) {
    throw new HTTPException(404, { message: 'Artwork not found' });
  }

  const track = tracks[trackIndex];

  if (!isRecord(track)) {
    throw new HTTPException(404, { message: 'Artwork not found' });
  }

  const sourceUrl = getHttpUrl(getArtworkSourceUrl(track.artwork));

  if (!sourceUrl) {
    throw new HTTPException(404, { message: 'Artwork not found' });
  }

  return sourceUrl;
};

const getTrackArtworkCacheKey = async ({
  requestUrl,
  sourceUrl,
}: {
  requestUrl: string;
  sourceUrl: URL;
}) => {
  const url = new URL(requestUrl);
  url.search = '';
  url.searchParams.set('source', await getHexDigest(sourceUrl.toString()));
  return new Request(url.toString(), { method: 'GET' });
};

const transformTrackArtwork = async (env: CloudflareEnv, sourceUrl: URL) => {
  const sourceResponse = await fetch(sourceUrl.toString(), {
    headers: { Accept: 'image/avif,image/webp,image/*,*/*' },
  });

  if (!sourceResponse.ok || !sourceResponse.body) {
    throw new HTTPException(502, { message: 'Artwork fetch failed' });
  }

  const output = await env.IMAGES.input(sourceResponse.body)
    .transform({
      fit: 'cover',
      height: LOCK_SCREEN_ARTWORK_DIMENSION,
      width: LOCK_SCREEN_ARTWORK_DIMENSION,
    })
    .output({ format: 'image/webp', quality: LOCK_SCREEN_ARTWORK_QUALITY })
    .catch((error: unknown) => {
      console.error('Failed to transform track artwork', { error });
      throw new HTTPException(502, { message: 'Artwork transform failed' });
    });

  const response = output.response();

  if (!response.body) {
    throw new HTTPException(502, { message: 'Artwork transform failed' });
  }

  const headers = new Headers(response.headers);
  headers.delete('Set-Cookie');
  headers.delete('Vary');
  headers.set('Cache-Control', TRACK_ARTWORK_CACHE_CONTROL);
  headers.set('Content-Type', 'image/webp');

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

app.get('/:fileId/tracks/:trackIndex/artwork', db(), async (c) => {
  const sourceUrl = await getTrackArtworkUrl({
    dbClient: c.var.db,
    fileId: c.req.param('fileId'),
    trackIndex: parseTrackIndex(c.req.param('trackIndex')),
  });

  const cache = await caches.open('track-artwork');

  const cacheKey = await getTrackArtworkCacheKey({
    requestUrl: c.req.url,
    sourceUrl,
  });

  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;
  const response = await transformTrackArtwork(c.env, sourceUrl);

  c.executionCtx.waitUntil(
    cache.put(cacheKey, response.clone()).catch((error: unknown) => {
      console.error('Failed to cache track artwork', {
        error,
        fileId: c.req.param('fileId'),
        trackIndex: c.req.param('trackIndex'),
      });
    })
  );

  return response;
});

export default app;
