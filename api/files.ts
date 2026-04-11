import { Role } from '@/enums/roles';
import { db, type Db } from '@/middleware/db';
import { fileLike } from '@/schemas/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

app.get('/:key{.+}', async (c) => {
  const rangeHeader = c.req.header('Range');

  const file = await c.env.R2.get(
    c.req.param('key'),
    rangeHeader ? { range: c.req.raw.headers } : undefined
  );

  if (!file) {
    throw new HTTPException(404, { message: 'File not found' });
  }

  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  c.header('Accept-Ranges', 'bytes');

  if (file.etag) {
    c.header('ETag', file.etag);
    const ifNoneMatch = c.req.header('If-None-Match');

    if (ifNoneMatch === file.etag) {
      return c.body(null, 304);
    }
  }

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

const queryProfileWithImage = (userId: string) => ({
  profiles: {
    $: { fields: ['id'] as ['id'], where: { user: userId } },
    image: {},
  },
});

const queryTeamWithImageAndRole = (teamId: string, userId: string) => ({
  roles: {
    $: { where: { team: teamId, userId } },
  },
  teams: {
    $: { fields: ['id'] as ['id'], where: { id: teamId } },
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

app.put(
  '/teams/:teamId/avatar',
  db({ asUser: true }),
  zValidator('form', z.object({ file: fileLike })),
  async (c) => {
    const { teamId } = c.req.param();
    const { file } = c.req.valid('form');

    if (!file.type.startsWith('image/')) {
      throw new HTTPException(400, { message: 'Invalid file format' });
    }

    const result = await c.var.db.query(
      queryTeamWithImageAndRole(teamId, c.var.user.id)
    );

    const team = result.teams?.[0];
    const callerRole = result.roles?.[0]?.role;

    if (!team?.id) {
      throw new HTTPException(404, { message: 'Team not found' });
    }

    if (callerRole !== Role.Owner && callerRole !== Role.Admin) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    if (team.image) {
      await c.env.R2.delete(team.image.uri as string);
      await c.var.db.transact(c.var.db.tx.media[team.image.id].delete());
    }

    const mediaId = id();

    const upload = await c.env.R2.put(
      `teams/${teamId}/media/${mediaId}`,
      file as File,
      { httpMetadata: { contentType: file.type } }
    );

    await c.var.db.transact(
      c.var.db.tx.media[mediaId]
        .update({ teamId, type: 'image', uri: upload.key })
        .link({ team: teamId })
    );

    return c.json({ success: true });
  }
);

app.delete('/teams/:teamId/avatar', db({ asUser: true }), async (c) => {
  const { teamId } = c.req.param();

  const result = await c.var.db.query(
    queryTeamWithImageAndRole(teamId, c.var.user.id)
  );

  const team = result.teams?.[0];
  const callerRole = result.roles?.[0]?.role;

  if (!team?.id) {
    throw new HTTPException(404, { message: 'Team not found' });
  }

  if (callerRole !== Role.Owner && callerRole !== Role.Admin) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  if (team.image) {
    await c.var.db.transact(c.var.db.tx.media[team.image.id].delete());
    await c.env.R2.delete(team.image.uri as string);
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
  media,
  mediaId: clientMediaId,
  order,
  r2,
  recordId,
}: {
  db: Db;
  duration?: number;
  file: z.infer<typeof fileLike>;
  keyPrefix: string;
  linkField: string;
  linkId: string;
  media: MediaBinding;
  mediaId?: string;
  order?: number;
  r2: R2Bucket;
  recordId: string;
}) => {
  if (
    !file.type.startsWith('image/') &&
    !file.type.startsWith('audio/') &&
    !file.type.startsWith('video/')
  ) {
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

  const mediaId = clientMediaId || id();

  const type = file.type.startsWith('audio/')
    ? 'audio'
    : file.type.startsWith('video/')
      ? 'video'
      : 'image';

  const key = `${keyPrefix}/media/${mediaId}`;
  let previewUri: string | undefined;

  if (type === 'video') {
    const [, preview] = await Promise.all([
      r2.put(key, file as File, {
        httpMetadata: { contentType: file.type },
      }),
      media
        .input((file as File).stream())
        .transform({ width: 500 })
        .output({ mode: 'frame', time: '0s', format: 'jpg' })
        .response(),
    ]);

    const previewKey = `${key}_preview`;

    await r2.put(previewKey, await preview.arrayBuffer(), {
      httpMetadata: { contentType: 'image/jpeg' },
    });

    previewUri = previewKey;
  } else {
    await r2.put(key, file as File, {
      httpMetadata: { contentType: file.type },
    });
  }

  await dbClient.transact(
    dbClient.tx.media[mediaId]
      .update({
        teamId,
        type,
        uri: key,
        ...((type === 'audio' || type === 'video') && duration != null
          ? { duration }
          : {}),
        ...(order != null ? { order } : {}),
        ...(previewUri ? { previewUri } : {}),
      })
      .link({ [linkField]: linkId })
  );
};

const mediaValidator = zValidator(
  'form',
  z.object({
    duration: z.coerce.number().optional(),
    file: fileLike,
    mediaId: z.string().optional(),
    order: z.coerce.number().optional(),
  })
);

app.put(
  '/records/:recordId/media',
  db({ asUser: true }),
  mediaValidator,
  async (c) => {
    const { recordId } = c.req.param();
    const { duration, file, mediaId, order } = c.req.valid('form');

    await uploadMedia({
      db: c.var.db,
      duration,
      file,
      keyPrefix: `records/${recordId}`,
      linkField: 'record',
      linkId: recordId,
      media: c.env.MEDIA,
      mediaId,
      order,
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
    const key = `records/${recordId}/media/${mediaId}`;

    await Promise.all([
      c.env.R2.delete(key),
      c.env.R2.delete(`${key}_preview`),
    ]);

    return c.json({ success: true });
  }
);

app.put(
  '/records/:recordId/comments/:commentId/media',
  db({ asUser: true }),
  mediaValidator,
  async (c) => {
    const { commentId, recordId } = c.req.param();
    const { duration, file, mediaId, order } = c.req.valid('form');

    await uploadMedia({
      db: c.var.db,
      duration,
      file,
      keyPrefix: `comments/${commentId}`,
      linkField: 'comment',
      linkId: commentId,
      media: c.env.MEDIA,
      mediaId,
      order,
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
    const key = `comments/${commentId}/media/${mediaId}`;

    await Promise.all([
      c.env.R2.delete(key),
      c.env.R2.delete(`${key}_preview`),
    ]);

    return c.json({ success: true });
  }
);

export default app;
