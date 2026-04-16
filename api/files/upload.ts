import { type Db } from '@/api/middleware/db';
import { fileLike } from '@/types/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

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
  linkField: 'reply' | 'record';
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
