import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const AVATAR_CACHE_CONTROL =
  'public, max-age=604800, s-maxage=31536000, immutable';

const MAX_SEED_LENGTH = 160;
const app = new Hono<{ Bindings: CloudflareEnv }>();

const getDiceBearAvatarUrl = (fallback: string, seed: string) => {
  const encodedSeed = encodeURIComponent(seed);

  if (fallback === 'gradient') {
    return `https://api.dicebear.com/9.x/glass/png?seed=${encodedSeed}&backgroundType=gradientLinear&size=64`;
  }

  if (fallback === 'neutral') {
    return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodedSeed}&backgroundColor=ffffff&size=64`;
  }
};

const proxyImage = async (url: string) => {
  const response = await fetch(url, {
    headers: { Accept: 'image/avif,image/webp,image/*,*/*' },
  });

  if (!response.ok || !response.body) {
    throw new HTTPException(502, { message: 'Avatar transform failed' });
  }

  const headers = new Headers(response.headers);
  headers.delete('Set-Cookie');
  headers.delete('Vary');
  headers.set('Cache-Control', AVATAR_CACHE_CONTROL);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

app.get('/avatars/:fallback', async (c) => {
  const seed = c.req.query('seed')?.trim();

  if (!seed || seed.length > MAX_SEED_LENGTH) {
    throw new HTTPException(400, { message: 'Invalid avatar seed' });
  }

  const url = getDiceBearAvatarUrl(c.req.param('fallback') ?? '', seed);
  if (!url) throw new HTTPException(400, { message: 'Invalid avatar style' });
  return proxyImage(url);
});

export default app;
