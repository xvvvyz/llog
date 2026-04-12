import { isManagedRole } from '@/enums/roles';
import { createAdminDb, db, type Db } from '@/middleware/db';
import { fileLike } from '@/schemas/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

const app = new Hono<{ Bindings: CloudflareEnv }>();

type AppContext = Context<{ Bindings: CloudflareEnv }>;
type MediaKind = 'image' | 'audio' | 'video';

const MAX_BYTES_BY_KIND: Record<MediaKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

const uploadLimit = (maxFileBytes: number) =>
  bodyLimit({
    maxSize: maxFileBytes + MULTIPART_OVERHEAD_BYTES,
    onError: () => {
      throw new HTTPException(413, { message: 'File too large' });
    },
  });

const getMediaKind = (file: File) => {
  if (file.type.startsWith('image/')) return 'image' as const;
  if (file.type.startsWith('audio/')) return 'audio' as const;
  if (file.type.startsWith('video/')) return 'video' as const;
  return null;
};

const getAuthToken = (c: AppContext) =>
  c.req.query('token') ?? c.req.header('Authorization')?.split(' ')[1] ?? '';

const getFileScope = (key: string) => {
  if (key.startsWith('profiles/') || key.startsWith('teams/')) {
    return 'public';
  }

  if (key.startsWith('records/') || key.startsWith('comments/')) {
    return 'private';
  }

  return 'unknown';
};

const getMediaByKey = async (dbClient: Db, key: string) => {
  const uriResult = await dbClient.query({
    media: {
      $: { fields: ['id'] as ['id'], where: { uri: key } },
    },
  });

  if (uriResult.media?.[0]?.id) {
    return uriResult.media[0];
  }

  const previewResult = await dbClient.query({
    media: {
      $: { fields: ['id'] as ['id'], where: { previewUri: key } },
    },
  });

  return previewResult.media?.[0];
};

const requirePrivateFileAccess = async (c: AppContext, key: string) => {
  const token = getAuthToken(c);

  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const adminDb = createAdminDb(c.env);

  try {
    await adminDb.auth.verifyToken(token);
  } catch {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const media = await getMediaByKey(adminDb.asUser({ token }), key);

  if (!media?.id) {
    throw new HTTPException(404, { message: 'File not found' });
  }
};

const requireUploadedFile = (file: z.infer<typeof fileLike>) => {
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: 'Invalid upload' });
  }

  return file;
};

const validateUpload = (file: File, allowed: MediaKind[]) => {
  const kind = getMediaKind(file);

  if (!kind || !allowed.includes(kind)) {
    throw new HTTPException(400, { message: 'Invalid file format' });
  }

  if (file.size > MAX_BYTES_BY_KIND[kind]) {
    throw new HTTPException(413, { message: 'File too large' });
  }

  return kind;
};

app.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const scope = getFileScope(key);

  if (scope === 'unknown') {
    throw new HTTPException(404, { message: 'File not found' });
  }

  if (scope === 'private') {
    await requirePrivateFileAccess(c, key);
    c.header('Cache-Control', 'private, no-store');
    c.header('Vary', 'Authorization');
  } else {
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
  }

  const rangeHeader = c.req.header('Range');

  const file = await c.env.R2.get(
    key,
    rangeHeader ? { range: c.req.raw.headers } : undefined
  );

  if (!file) {
    throw new HTTPException(404, { message: 'File not found' });
  }

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
  uploadLimit(MAX_BYTES_BY_KIND.image),
  db({ asUser: true }),
  zValidator('form', z.object({ file: fileLike })),
  async (c) => {
    const { teamId } = c.req.param();
    const upload = requireUploadedFile(c.req.valid('form').file);
    validateUpload(upload, ['image']);

    const result = await c.var.db.query(
      queryTeamWithImageAndRole(teamId, c.var.user.id)
    );

    const team = result.teams?.[0];
    const callerRole = result.roles?.[0]?.role;

    if (!team?.id) {
      throw new HTTPException(404, { message: 'Team not found' });
    }

    if (!isManagedRole(callerRole)) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    if (team.image) {
      await c.env.R2.delete(team.image.uri as string);
      await c.var.db.transact(c.var.db.tx.media[team.image.id].delete());
    }

    const mediaId = id();

    const stored = await c.env.R2.put(
      `teams/${teamId}/media/${mediaId}`,
      upload,
      { httpMetadata: { contentType: upload.type } }
    );

    await c.var.db.transact(
      c.var.db.tx.media[mediaId]
        .update({ teamId, type: 'image', uri: stored.key })
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

  if (!isManagedRole(callerRole)) {
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
  const upload = requireUploadedFile(file);
  const type = validateUpload(upload, ['image', 'audio', 'video']);

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
  const key = `${keyPrefix}/media/${mediaId}`;
  let previewUri: string | undefined;

  if (type === 'video') {
    const [, preview] = await Promise.all([
      r2.put(key, upload, {
        httpMetadata: { contentType: upload.type },
      }),
      media
        .input(upload.stream())
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
    await r2.put(key, upload, {
      httpMetadata: { contentType: upload.type },
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
  uploadLimit(MAX_BYTES_BY_KIND.video),
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
    const { media } = await c.var.db.query({
      media: {
        $: { where: { id: mediaId } },
        record: {
          author: { user: { $: { fields: ['id'] } } },
          log: {
            team: {
              roles: {
                $: {
                  fields: ['role'] as ['role'],
                  where: { userId: c.var.user.id },
                },
              },
            },
          },
        },
      },
    });

    const item = media[0];
    const callerRole = item?.record?.log?.team?.roles?.[0]?.role;

    const canDelete =
      item?.record?.id === recordId &&
      (item.record.author?.user?.id === c.var.user.id ||
        isManagedRole(callerRole));

    if (!item?.id || !canDelete) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    await c.var.db.transact(c.var.db.tx.media[mediaId].delete());

    await Promise.all([
      c.env.R2.delete(item.uri as string),
      item.previewUri ? c.env.R2.delete(item.previewUri as string) : undefined,
    ]);

    return c.json({ success: true });
  }
);

app.put(
  '/records/:recordId/comments/:commentId/media',
  uploadLimit(MAX_BYTES_BY_KIND.video),
  db({ asUser: true }),
  mediaValidator,
  async (c) => {
    const { commentId, recordId } = c.req.param();
    const { duration, file, mediaId, order } = c.req.valid('form');

    const { comments } = await c.var.db.query({
      comments: {
        $: {
          fields: ['id'] as ['id'],
          where: { id: commentId, record: recordId },
        },
      },
    });

    if (!comments[0]?.id) {
      throw new HTTPException(400, { message: 'Comment not found' });
    }

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
    const { commentId, mediaId, recordId } = c.req.param();
    const { media } = await c.var.db.query({
      media: {
        $: { where: { id: mediaId } },
        comment: {
          $: { fields: ['id'] as ['id'] },
          author: { user: { $: { fields: ['id'] } } },
          record: {
            $: { fields: ['id'] as ['id'] },
            log: {
              team: {
                roles: {
                  $: {
                    fields: ['role'] as ['role'],
                    where: { userId: c.var.user.id },
                  },
                },
              },
            },
          },
        },
      },
    });

    const item = media[0];
    const callerRole = item?.comment?.record?.log?.team?.roles?.[0]?.role;

    const canDelete =
      item?.comment?.id === commentId &&
      item.comment.record?.id === recordId &&
      (item.comment.author?.user?.id === c.var.user.id ||
        isManagedRole(callerRole));

    if (!item?.id || !canDelete) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    await c.var.db.transact(c.var.db.tx.media[mediaId].delete());

    await Promise.all([
      c.env.R2.delete(item.uri as string),
      item.previewUri ? c.env.R2.delete(item.previewUri as string) : undefined,
    ]);

    return c.json({ success: true });
  }
);

export default app;
