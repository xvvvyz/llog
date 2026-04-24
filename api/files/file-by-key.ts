import { getFileScope } from '@/api/files/r2-keys';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const scope = getFileScope(key);

  if (scope === 'unknown') {
    throw new HTTPException(404, { message: 'File not found' });
  }

  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  const rangeHeader = c.req.header('Range');
  const onlyIfHeader = c.req.header('If-None-Match');

  const file = await c.env.R2.get(key, {
    ...(rangeHeader ? { range: c.req.raw.headers } : {}),
    ...(onlyIfHeader ? { onlyIf: c.req.raw.headers } : {}),
  });

  if (!file) throw new HTTPException(404, { message: 'File not found' });
  c.header('Accept-Ranges', 'bytes');
  if (file.etag) c.header('ETag', file.etag);
  if (!('body' in file)) return c.body(null, 304);

  if (file.httpMetadata?.contentType) {
    c.header('Content-Type', file.httpMetadata.contentType);
  }

  if ('range' in file && file.range) {
    const range = file.range as { offset: number; length: number };
    c.header('Content-Length', range.length.toString());

    c.header(
      'Content-Range',
      `bytes ${range.offset}-${range.offset + range.length - 1}/${file.size}`
    );

    return c.body(file.body, 206);
  }

  c.header('Content-Length', file.size.toString());
  return c.body(file.body);
});

export default app;
