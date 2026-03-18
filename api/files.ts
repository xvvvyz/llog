import { db, type Db } from '@/middleware/db';
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

  if (file.httpMetadata?.contentType) {
    c.header('Content-Type', file.httpMetadata.contentType);
  }

  return c.body(file.body);
});

const queryProfileWithImage = (userId: string) => ({
  profiles: {
    $: { fields: ['id'] as ['id'], where: { user: userId } },
    image: {},
  },
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

    const result = await c.var.db.query(queryProfileWithImage(c.var.user.id));
    const profile = result.profiles?.[0];

    if (!profile.id) {
      throw new HTTPException(400, { message: 'Profile not found' });
    }

    if (profile.image) {
      await c.env.R2.delete(profile.image.uri as string);
    }

    const mediaId = id();

    const upload = await c.env.R2.put(
      `profiles/${c.var.user.id}/media/${mediaId}`,
      file as File,
      { httpMetadata: { contentType: file.type } }
    );

    await c.var.db.transact(
      c.var.db.tx.media[mediaId]
        .update({ type: 'image', uri: upload.key })
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
    await c.env.R2.delete(profile.image.uri as string);
  }

  return c.json({ success: true });
});

const uploadMedia = async ({
  db: dbClient,
  duration,
  file,
  keyPrefix,
  linkField,
  linkId,
  r2,
  recordId,
}: {
  db: Db;
  duration?: number;
  file: z.infer<typeof fileLike>;
  keyPrefix: string;
  linkField: string;
  linkId: string;
  r2: R2Bucket;
  recordId: string;
}) => {
  if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
    throw new HTTPException(400, { message: 'Invalid file format' });
  }

  const { records } = await dbClient.query({
    records: {
      $: { fields: ['id'], where: { id: recordId } },
      log: { team: { $: { fields: ['id'] } } },
    },
  });

  const record = records[0];

  if (!record) {
    throw new HTTPException(400, { message: 'Record not found' });
  }

  const teamId = record.log?.team?.id;

  if (!teamId) {
    throw new HTTPException(400, { message: 'Record has no team' });
  }

  const mediaId = id();
  const type = file.type.startsWith('audio/') ? 'audio' : 'image';
  const key = `${keyPrefix}/media/${mediaId}`;

  await Promise.all([
    r2.put(key, file as File, {
      httpMetadata: { contentType: file.type },
    }),
    dbClient.transact(
      dbClient.tx.media[mediaId]
        .update({
          teamId,
          type,
          uri: key,
          ...(type === 'audio' && duration != null ? { duration } : {}),
        })
        .link({ [linkField]: linkId })
    ),
  ]);
};

const mediaValidator = zValidator(
  'form',
  z.object({ duration: z.coerce.number().optional(), file: fileLike })
);

app.put(
  '/records/:recordId/media',
  db({ asUser: true }),
  mediaValidator,
  async (c) => {
    const { recordId } = c.req.param();
    const { duration, file } = c.req.valid('form');

    await uploadMedia({
      db: c.var.db,
      duration,
      file,
      keyPrefix: `records/${recordId}`,
      linkField: 'record',
      linkId: recordId,
      r2: c.env.R2,
      recordId,
    });

    return c.json({ success: true });
  }
);

app.delete(
  '/records/:recordId/media/:mediaId',
  db({ asUser: true }),
  async (c) => {
    const { mediaId, recordId } = c.req.param();
    await c.env.R2.delete(`records/${recordId}/media/${mediaId}`);
    return c.json({ success: true });
  }
);

app.put(
  '/records/:recordId/comments/:commentId/media',
  db({ asUser: true }),
  mediaValidator,
  async (c) => {
    const { commentId, recordId } = c.req.param();
    const { duration, file } = c.req.valid('form');

    await uploadMedia({
      db: c.var.db,
      duration,
      file,
      keyPrefix: `comments/${commentId}`,
      linkField: 'comment',
      linkId: commentId,
      r2: c.env.R2,
      recordId,
    });

    return c.json({ success: true });
  }
);

app.delete(
  '/records/:recordId/comments/:commentId/media/:mediaId',
  db({ asUser: true }),
  async (c) => {
    const { commentId, mediaId } = c.req.param();
    await c.env.R2.delete(`comments/${commentId}/media/${mediaId}`);
    return c.json({ success: true });
  }
);

export default app;
