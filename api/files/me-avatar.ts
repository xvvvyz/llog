import { db } from '@/api/middleware/db';
import { fileLike } from '@/types/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';
import {
  MAX_BYTES_BY_KIND,
  queryProfileWithImage,
  requireUploadedFile,
  uploadLimit,
  validateUpload,
} from './shared';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.put(
  '/',
  uploadLimit(MAX_BYTES_BY_KIND.image),
  db({ asUser: true }),
  zValidator('form', z.object({ file: fileLike })),
  async (c) => {
    const upload = requireUploadedFile(c.req.valid('form').file);
    validateUpload(upload, ['image']);

    const result = await c.var.db.query(queryProfileWithImage(c.var.user.id));
    const profile = result.profiles?.[0];

    if (!profile?.id) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    if (profile.image) {
      await c.env.R2.delete(profile.image.uri as string);
    }

    const mediaId = id();

    const stored = await c.env.R2.put(
      `profiles/${c.var.user.id}/media/${mediaId}`,
      upload,
      { httpMetadata: { contentType: upload.type } }
    );

    await c.var.db.transact(
      c.var.db.tx.media[mediaId]
        .update({ type: 'image', uri: stored.key })
        .link({ profile: profile.id })
    );

    return c.json({ success: true });
  }
);

app.delete('/', db({ asUser: true }), async (c) => {
  const result = await c.var.db.query(queryProfileWithImage(c.var.user.id));
  const profile = result.profiles?.[0];

  if (profile.image) {
    await c.var.db.transact(c.var.db.tx.media[profile.image.id].delete());
    await c.env.R2.delete(profile.image.uri as string);
  }

  return c.json({ success: true });
});

export default app;
