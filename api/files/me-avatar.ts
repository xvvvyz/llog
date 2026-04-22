import { storeImageDeliveryUrl, uploadImage } from '@/api/files/images';
import { deleteMediaAssets } from '@/api/files/media-cleanup';
import * as upload from '@/api/files/upload';
import { db } from '@/api/middleware/db';
import { fileLike } from '@/features/media/types/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const queryProfileWithImage = (userId: string) => ({
  profiles: {
    $: { fields: ['id'] as ['id'], where: { user: userId } },
    image: {},
  },
});

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.put(
  '/me/avatar',
  upload.uploadLimit(upload.MAX_BYTES_BY_KIND.image),
  db({ asUser: true }),
  zValidator('form', z.object({ file: fileLike })),
  async (c) => {
    const file = upload.requireUploadedFile(c.req.valid('form').file);
    upload.validateUpload(file, ['image']);

    const result = await c.var.db.query(queryProfileWithImage(c.var.user.id));
    const profile = result.profiles?.[0];

    if (!profile?.id) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    if (profile.image) {
      await c.var.db.transact(c.var.db.tx.media[profile.image.id].delete());
      await deleteMediaAssets(c.env, [profile.image]);
    }

    const mediaId = id();

    const stored = await uploadImage({
      creator: c.var.user.id,
      env: c.env,
      file,
    });

    await c.var.db.transact(
      c.var.db.tx.media[mediaId]
        .update({
          assetKey: storeImageDeliveryUrl(stored.deliveryUrl),
          type: 'image',
          uri: stored.deliveryUrl,
        })
        .link({ profile: profile.id })
    );

    return c.json({ success: true });
  }
);

app.delete('/me/avatar', db({ asUser: true }), async (c) => {
  const result = await c.var.db.query(queryProfileWithImage(c.var.user.id));
  const profile = result.profiles?.[0];

  if (profile.image) {
    await c.var.db.transact(c.var.db.tx.media[profile.image.id].delete());
    await deleteMediaAssets(c.env, [profile.image]);
  }

  return c.json({ success: true });
});

export default app;
