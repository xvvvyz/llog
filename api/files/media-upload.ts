import * as cloudflareImages from '@/api/files/cloudflare-images';
import { createDirectVideoUpload } from '@/api/files/cloudflare-stream';
import { type Db } from '@/api/middleware/db';
import { fileLike } from '@/features/media/types/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

type MediaKind = 'image' | 'audio' | 'video';
type MultipartMediaKind = Exclude<MediaKind, 'video'>;
const PENDING_STREAM_URI_PREFIX = 'stream-pending:';
const MAX_STREAM_UPLOAD_DURATION_SECONDS = 36000;

const DIRECT_VIDEO_UPLOAD_MAX_DURATION_SECONDS =
  MAX_STREAM_UPLOAD_DURATION_SECONDS;

export const MAX_BYTES_BY_KIND: Record<MediaKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

export const MAX_MULTIPART_MEDIA_BYTES = Math.max(
  MAX_BYTES_BY_KIND.image,
  MAX_BYTES_BY_KIND.audio
);

const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

const normalizeDurationSeconds = (duration?: number) => {
  if (!Number.isFinite(duration) || duration == null || duration < 0) {
    return undefined;
  }

  return Math.round(duration);
};

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

const denyUploadTarget = () => {
  throw new HTTPException(403, { message: 'Forbidden' });
};

const assertCanUploadToOwnedTarget = async ({
  creatorId,
  db: dbClient,
  linkField,
  linkId,
  recordId,
}: {
  creatorId: string;
  db: Db;
  linkField: 'reply' | 'record';
  linkId: string;
  recordId: string;
}) => {
  if (linkField === 'record') {
    const { records } = await dbClient.query({
      records: {
        $: { fields: ['id'], where: { id: recordId } },
        author: { user: { $: { fields: ['id'] } } },
        log: {
          team: {
            $: { fields: ['id'] },
            roles: { $: { fields: ['id'], where: { userId: creatorId } } },
          },
        },
      },
    });

    const record = records[0];

    if (
      !record?.id ||
      record.author?.user?.id !== creatorId ||
      !record.log?.team?.roles?.[0]?.id
    ) {
      denyUploadTarget();
    }

    return;
  }

  const { replies } = await dbClient.query({
    replies: {
      $: { fields: ['id'], where: { id: linkId, record: recordId } },
      author: { user: { $: { fields: ['id'] } } },
      record: {
        $: { fields: ['id'] },
        log: {
          team: {
            $: { fields: ['id'] },
            roles: { $: { fields: ['id'], where: { userId: creatorId } } },
          },
        },
      },
    },
  });

  const reply = replies[0];

  if (
    !reply?.id ||
    reply.record?.id !== recordId ||
    reply.author?.user?.id !== creatorId ||
    !reply.record?.log?.team?.roles?.[0]?.id
  ) {
    denyUploadTarget();
  }
};

export const uploadMedia = async ({
  creatorId,
  db: dbClient,
  duration,
  env,
  file,
  keyPrefix,
  linkField,
  linkId,
  mediaId: clientMediaId,
  order,
  recordId,
}: {
  creatorId: string;
  db: Db;
  duration?: number;
  env: CloudflareEnv;
  file: z.infer<typeof fileLike>;
  keyPrefix: string;
  linkField: 'reply' | 'record';
  linkId: string;
  mediaId?: string;
  order?: number;
  recordId: string;
}) => {
  const upload = requireUploadedFile(file);
  const type = validateUpload(upload, ['image', 'audio']) as MultipartMediaKind;

  await assertCanUploadToOwnedTarget({
    creatorId,
    db: dbClient,
    linkField,
    linkId,
    recordId,
  });

  const mediaId = clientMediaId || id();
  const normalizedDuration = normalizeDurationSeconds(duration);
  const baseKey = `${keyPrefix}/media/${mediaId}`;
  let assetKey: string | undefined;
  let uri = baseKey;

  if (type === 'image') {
    const uploadedImage = await cloudflareImages.uploadImage({
      creator: creatorId,
      env,
      file: upload,
    });

    assetKey = cloudflareImages.storeImageDeliveryUrl(
      uploadedImage.deliveryUrl
    );

    uri = uploadedImage.deliveryUrl;
  } else {
    await env.R2.put(baseKey, upload, {
      httpMetadata: { contentType: upload.type },
    });

    assetKey = baseKey;
  }

  await dbClient.transact(
    dbClient.tx.media[mediaId]
      .update({
        ...(assetKey ? { assetKey } : {}),
        type,
        uri,
        ...(type === 'audio' && normalizedDuration != null
          ? { duration: normalizedDuration }
          : {}),
        ...(order != null ? { order } : {}),
      })
      .link({ [linkField]: linkId })
  );

  return { assetKey, mediaId, type, uri };
};

export const createDirectVideoUploadDraft = async ({
  creatorId,
  db: dbClient,
  env,
  linkField,
  linkId,
  mediaId: clientMediaId,
  order,
  recordId,
}: {
  creatorId: string;
  db: Db;
  env: CloudflareEnv;
  linkField: 'reply' | 'record';
  linkId: string;
  mediaId?: string;
  order?: number;
  recordId: string;
}) => {
  await assertCanUploadToOwnedTarget({
    creatorId,
    db: dbClient,
    linkField,
    linkId,
    recordId,
  });

  const mediaId = clientMediaId || id();

  const { uid, uploadURL } = await createDirectVideoUpload(env, {
    creator: creatorId,
    maxDurationSeconds: DIRECT_VIDEO_UPLOAD_MAX_DURATION_SECONDS,
  });

  await dbClient.transact(
    dbClient.tx.media[mediaId]
      .update({
        assetKey: uid,
        type: 'video',
        uri: `${PENDING_STREAM_URI_PREFIX}${uid}`,
        ...(order != null ? { order } : {}),
      })
      .link({ [linkField]: linkId })
  );

  return { mediaId, streamUid: uid, uploadURL };
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

export const directVideoUploadValidator = zValidator(
  'json',
  z.object({
    mediaId: z.string().optional(),
    order: z.coerce.number().optional(),
  })
);
