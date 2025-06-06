import { auth, AuthVariables } from '@/middleware/auth';
import { db } from '@/middleware/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: AuthVariables;
}>();

app.use('/v1/*', cors());

app.put(
  '/v1/me/avatar',
  db(),
  auth(),
  zValidator('form', z.object({ file: z.instanceof(File) })),
  async (c) => {
    const file = c.req.valid('form').file;
    const key = `${c.var.user.id}/avatar`;

    if (!file.type.startsWith('image/')) {
      throw new HTTPException(400, { message: 'Invalid file format' });
    }

    const upload = await c.env.R2.put(key, file, {
      httpMetadata: { contentType: file.type },
    });

    const { profiles } = await c.var.db.query({
      profiles: { $: { fields: ['id'], where: { user: c.var.user.id } } },
    });

    const profile = profiles[0];

    if (!profile) {
      throw new HTTPException(400, { message: 'User has no profile' });
    }

    await c.var.db.asUser({ token: c.var.user.refresh_token }).transact(
      c.var.db.tx.profiles[profile.id].update({
        avatar: `${upload.key}?etag=${upload.httpEtag}`,
      })
    );

    return c.json({ success: true });
  }
);

app.delete('/v1/me/avatar', db(), auth(), async (c) => {
  const { profiles } = await c.var.db.query({
    profiles: { $: { fields: ['avatar'], where: { user: c.var.user.id } } },
  });

  const profile = profiles[0];

  if (profile?.avatar) {
    await c.env.R2.delete(profile.avatar.split('?')[0]);

    await c.var.db
      .asUser({ token: c.var.user.refresh_token })
      .transact(c.var.db.tx.profiles[profile.id].update({ avatar: null }));
  }

  return c.json({ success: true });
});

app.get('/v1/files/:key{.+}', async (c) => {
  const file = await c.env.R2.get(c.req.param('key'));

  if (!file) {
    throw new HTTPException(404, { message: 'File not found' });
  }

  if (c.req.header('If-None-Match') === file.httpEtag) {
    return new Response(null, { status: 304 });
  }

  c.header('Cache-Control', 'public, no-cache');
  c.header('Content-Type', file.httpMetadata!.contentType);
  c.header('ETag', file.httpEtag);
  return c.body(file.body);
});

export default app;
