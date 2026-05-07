import { db, type Db } from '@/api/middleware/db';
import { asString, isRecord } from '@/lib/coerce';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const LOCK_SCREEN_ARTWORK_DIMENSION = 512;
const LOCK_SCREEN_ARTWORK_QUALITY = 80;

const TRACK_ARTWORK_CACHE_CONTROL =
  'public, max-age=604800, s-maxage=31536000, immutable';

const app = new Hono<{ Bindings: CloudflareEnv }>();

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

const getTrackArtworkUrlFromSource = async ({
  dbClient,
  fileId,
  source,
}: {
  dbClient: Db;
  fileId?: string;
  source?: string | null;
}) => {
  if (!fileId) throw new HTTPException(400, { message: 'Invalid file' });
  const sourceUrl = getHttpUrl(source ?? undefined);

  if (!sourceUrl) {
    throw new HTTPException(400, { message: 'Invalid artwork source' });
  }

  const { files } = await dbClient.query({
    files: { $: { fields: ['id', 'tracks'], where: { id: fileId } } },
  });

  const tracks = files[0]?.tracks;

  if (!Array.isArray(tracks)) {
    throw new HTTPException(404, { message: 'Artwork not found' });
  }

  const isKnownArtworkSource = tracks.some((track) => {
    if (!isRecord(track)) return false;
    const trackSourceUrl = getHttpUrl(getArtworkSourceUrl(track.artwork));
    return trackSourceUrl?.toString() === sourceUrl.toString();
  });

  if (!isKnownArtworkSource) {
    throw new HTTPException(404, { message: 'Artwork not found' });
  }

  return sourceUrl;
};

const transformTrackArtwork = async (sourceUrl: URL) => {
  const response = await fetch(sourceUrl.toString(), {
    cf: {
      image: {
        fit: 'cover',
        format: 'webp',
        height: LOCK_SCREEN_ARTWORK_DIMENSION,
        metadata: 'none',
        quality: LOCK_SCREEN_ARTWORK_QUALITY,
        width: LOCK_SCREEN_ARTWORK_DIMENSION,
      },
    },
    headers: { Accept: 'image/avif,image/webp,image/*,*/*' },
  });

  if (!response.ok || !response.body) {
    throw new HTTPException(502, { message: 'Artwork transform failed' });
  }

  const headers = new Headers(response.headers);
  headers.delete('Set-Cookie');
  headers.delete('Vary');
  headers.set('Cache-Control', TRACK_ARTWORK_CACHE_CONTROL);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

app.get('/:fileId/track-artwork', db(), async (c) => {
  const sourceUrl = await getTrackArtworkUrlFromSource({
    dbClient: c.var.db,
    fileId: c.req.param('fileId'),
    source: c.req.query('source'),
  });

  return transformTrackArtwork(sourceUrl);
});

export default app;
