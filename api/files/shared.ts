import { createAdminDb, type Db } from '@/api/middleware/db';
import { fileLike } from '@/types/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

type AppContext = Context<{ Bindings: CloudflareEnv }>;
type MediaKind = 'image' | 'audio' | 'video';

export const MAX_BYTES_BY_KIND: Record<MediaKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

export const uploadLimit = (maxFileBytes: number) =>
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

export const getFileScope = (key: string) => {
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

export const requirePrivateFileAccess = async (c: AppContext, key: string) => {
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

export const requireUploadedFile = (file: z.infer<typeof fileLike>) => {
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: 'Invalid upload' });
  }

  return file;
};

export const validateUpload = (file: File, allowed: MediaKind[]) => {
  const kind = getMediaKind(file);

  if (!kind || !allowed.includes(kind)) {
    throw new HTTPException(400, { message: 'Invalid file format' });
  }

  if (file.size > MAX_BYTES_BY_KIND[kind]) {
    throw new HTTPException(413, { message: 'File too large' });
  }

  return kind;
};

export const queryProfileWithImage = (userId: string) => ({
  profiles: {
    $: { fields: ['id'] as ['id'], where: { user: userId } },
    image: {},
  },
});

export const queryTeamWithImageAndRole = (teamId: string, userId: string) => ({
  roles: {
    $: { where: { team: teamId, userId } },
  },
  teams: {
    $: { fields: ['id'] as ['id'], where: { id: teamId } },
    image: {},
  },
});

export const uploadMedia = async ({
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
  linkField: 'comment' | 'record';
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

export const mediaValidator = zValidator(
  'form',
  z.object({
    duration: z.coerce.number().optional(),
    file: fileLike,
    mediaId: z.string().optional(),
    order: z.coerce.number().optional(),
  })
);
