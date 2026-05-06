import * as cloudflareImages from '@/api/files/cloudflare-images';
import { deleteFileAssets } from '@/api/files/delete-file-assets';
import * as upload from '@/api/files/file-upload';
import { db } from '@/api/middleware/db';
import { fileLike } from '@/domain/files/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.put(
  '/me/avatar',
  upload.uploadLimit(),
  db({ asUser: true }),
  zValidator('form', z.object({ file: fileLike })),
  async (c) => {
    const file = upload.requireUploadedFile(c.req.valid('form').file);
    upload.validateUpload(file, ['image']);

    const result = await c.var.db.query({
      profiles: {
        $: { fields: ['id'], where: { user: c.var.user.id } },
        image: {},
      },
    });

    const profile = result.profiles?.[0];

    if (!profile?.id) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    if (profile.image) {
      await c.var.db.transact(c.var.db.tx.files[profile.image.id].delete());
      await deleteFileAssets(c.env, [profile.image]);
    }

    const fileId = id();

    const stored = await cloudflareImages.uploadImage({
      creator: c.var.user.id,
      env: c.env,
      file,
    });

    await c.var.db.transact(
      c.var.db.tx.files[fileId]
        .update({
          assetKey: cloudflareImages.storeImageDeliveryUrl(stored.deliveryUrl),
          order: 0,
          type: 'image',
          uri: stored.deliveryUrl,
        })
        .link({ profile: profile.id })
    );

    return c.json({ success: true });
  }
);

app.delete('/me/avatar', db({ asUser: true }), async (c) => {
  const result = await c.var.db.query({
    profiles: {
      $: { fields: ['id'], where: { user: c.var.user.id } },
      image: {},
    },
  });

  const profile = result.profiles?.[0];

  if (profile.image) {
    await c.var.db.transact(c.var.db.tx.files[profile.image.id].delete());
    await deleteFileAssets(c.env, [profile.image]);
  }

  return c.json({ success: true });
});

export default app;
