import { db } from '@/middleware/db';
import { fileLike } from '@/schemas/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.get('/:key{.+}', async (c) => {
  const file = await c.env.R2.get(c.req.param('key'));

  if (!file) {
    throw new HTTPException(404, { message: 'File not found' });
  }

  c.header('Cache-Control', 'public, max-age=31536000, immutable');

  if (file.httpMetadata) {
    c.header('Content-Type', file.httpMetadata.contentType);
  }

  return c.body(file.body);
});

app.put(
  '/me/avatar',
  db({ asUser: true }),
  zValidator('form', z.object({ file: fileLike })),
  async (c) => {
    const { file } = c.req.valid('form');

    if (!file.type.startsWith('image/')) {
      throw new HTTPException(400, { message: 'Invalid file format' });
    }

    const { profiles } = await c.var.db.query({
      profiles: {
        $: { fields: ['id'], where: { user: c.var.user.id } },
        image: {},
      },
    });

    const profile = profiles[0];

    if (!profile.id) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    if (profile.image) {
      await c.env.R2.delete(profile.image.uri as string);
    }

    const imageId = id();

    const upload = await c.env.R2.put(
      `profiles/${c.var.user.id}/images/${imageId}`,
      file as File,
      { httpMetadata: { contentType: file.type } }
    );

    await c.var.db.transact(
      c.var.db.tx.images[imageId]
        .update({ uri: upload.key })
        .link({ profile: profile.id })
    );

    return c.json({ success: true });
  }
);

app.delete('/me/avatar', db({ asUser: true }), async (c) => {
  const { profiles } = await c.var.db.query({
    profiles: {
      $: { fields: ['id'], where: { user: c.var.user.id } },
      image: {},
    },
  });

  const profile = profiles[0];

  if (profile.image) {
    await c.var.db.transact(c.var.db.tx.images[profile.image.id].delete());
    await c.env.R2.delete(profile.image.uri as string);
  }

  return c.json({ success: true });
});

app.put(
  '/records/:recordId/images',
  db({ asUser: true }),
  zValidator('form', z.object({ file: fileLike })),
  async (c) => {
    const { file } = c.req.valid('form');
    const { recordId } = c.req.param();

    if (!file.type.startsWith('image/')) {
      throw new HTTPException(400, { message: 'Invalid file format' });
    }

    const { records } = await c.var.db.query({
      records: { $: { fields: ['id'], where: { id: recordId } } },
    });

    if (!records.length) {
      throw new HTTPException(400, { message: 'Record not found' });
    }

    const imageId = id();

    const upload = await c.env.R2.put(
      `records/${recordId}/images/${imageId}`,
      file as File,
      { httpMetadata: { contentType: file.type } }
    );

    await c.var.db.transact(
      c.var.db.tx.images[imageId]
        .update({ uri: upload.key })
        .link({ record: recordId })
    );

    return c.json({ success: true });
  }
);

app.delete(
  '/records/:recordId/images/:imageId',
  db({ asUser: true }),
  async (c) => {
    const { imageId } = c.req.param();
    await c.var.db.transact(c.var.db.tx.images[imageId].delete());
    await c.env.R2.delete(imageId);
    return c.json({ success: true });
  }
);

export default app;
