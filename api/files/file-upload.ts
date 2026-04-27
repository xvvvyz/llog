import * as cloudflareImages from '@/api/files/cloudflare-images';
import * as cloudflareStream from '@/api/files/cloudflare-stream';
import { deleteFileAssets } from '@/api/files/delete-file-assets';
import { type Db } from '@/api/middleware/db';
import type { FileKind } from '@/features/files/types/file-kind';
import { fileLike } from '@/features/files/types/file-like';
import { zValidator } from '@hono/zod-validator';
import { id } from '@instantdb/admin';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod/v4';

type MultipartFileKind = Exclude<FileKind, 'video'>;
const PENDING_STREAM_URI_PREFIX = 'stream-pending:';
const MAX_STREAM_UPLOAD_DURATION_SECONDS = 36000;

const DIRECT_VIDEO_UPLOAD_MAX_DURATION_SECONDS =
  MAX_STREAM_UPLOAD_DURATION_SECONDS;

export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const DEFAULT_DOWNLOAD_FILE_NAME = 'download';

const normalizeDurationSeconds = (duration?: number) => {
  if (!Number.isFinite(duration) || duration == null || duration < 0) {
    return undefined;
  }

  return Math.round(duration);
};

const inferFileKind = (file: File) => {
  if (file.type.startsWith('image/')) return 'image' as const;
  if (file.type.startsWith('audio/')) return 'audio' as const;
  if (file.type.startsWith('video/')) return 'video' as const;
  return 'document' as const;
};

export const uploadLimit = (maxFileBytes = MAX_UPLOAD_BYTES) =>
  bodyLimit({
    maxSize: maxFileBytes + MULTIPART_OVERHEAD_BYTES,
    onError: () => {
      throw new HTTPException(413, { message: 'Upload too large' });
    },
  });

export const requireUploadedFile = (file: z.infer<typeof fileLike>) => {
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: 'Invalid upload' });
  }

  return file;
};

export const validateUpload = (file: File, allowed: FileKind[]) => {
  const kind = inferFileKind(file);

  if (!allowed.includes(kind)) {
    throw new HTTPException(400, { message: 'Invalid upload format' });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new HTTPException(413, { message: 'Upload too large' });
  }

  return kind;
};

const denyUploadTarget = () => {
  throw new HTTPException(403, { message: 'Forbidden' });
};

const normalizeFileName = (fileName?: string | null) => {
  const value = fileName?.trim();
  return value || undefined;
};

const normalizeMimeType = (mimeType?: string | null) => {
  const value = mimeType?.trim();
  return value || undefined;
};

const normalizeFileSize = (size?: number) =>
  Number.isFinite(size) && size != null && size >= 0
    ? Math.round(size)
    : undefined;

const getContentDisposition = (fileName?: string) => {
  const safeName = fileName
    ?.replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '_')
    .trim();

  if (!safeName) return undefined;

  const fallbackName = safeName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .trim();

  const encodedName = encodeURIComponent(safeName).replace(
    /['()*]/g,
    (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return `attachment; filename="${fallbackName || DEFAULT_DOWNLOAD_FILE_NAME}"; filename*=UTF-8''${encodedName}`;
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

export const uploadFile = async ({
  creatorId,
  db: dbClient,
  duration,
  env,
  file,
  fileName,
  keyPrefix,
  linkField,
  linkId,
  fileId: clientFileId,
  mimeType,
  order,
  recordId,
  size,
}: {
  creatorId: string;
  db: Db;
  duration?: number;
  env: CloudflareEnv;
  file: z.infer<typeof fileLike>;
  fileName?: string;
  keyPrefix: string;
  linkField: 'reply' | 'record';
  linkId: string;
  fileId?: string;
  mimeType?: string;
  order?: number;
  recordId: string;
  size?: number;
}) => {
  const upload = requireUploadedFile(file);

  const type = validateUpload(upload, [
    'image',
    'audio',
    'document',
  ]) as MultipartFileKind;

  await assertCanUploadToOwnedTarget({
    creatorId,
    db: dbClient,
    linkField,
    linkId,
    recordId,
  });

  const fileId = clientFileId || id();
  const normalizedDuration = normalizeDurationSeconds(duration);
  const normalizedName = normalizeFileName(fileName ?? upload.name);
  const normalizedMimeType = normalizeMimeType(mimeType ?? upload.type);
  const normalizedSize = normalizeFileSize(size ?? upload.size);
  const baseKey = `${keyPrefix}/files/${fileId}`;
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
    const contentDisposition =
      type === 'document' ? getContentDisposition(normalizedName) : undefined;

    await env.R2.put(baseKey, upload, {
      httpMetadata: {
        contentType: normalizedMimeType ?? 'application/octet-stream',
        ...(contentDisposition ? { contentDisposition } : {}),
      },
    });

    assetKey = baseKey;
  }

  try {
    await dbClient.transact(
      dbClient.tx.files[fileId]
        .update({
          ...(assetKey ? { assetKey } : {}),
          type,
          uri,
          ...(type === 'audio' && normalizedDuration != null
            ? { duration: normalizedDuration }
            : {}),
          ...(type === 'document' && normalizedName
            ? { name: normalizedName }
            : {}),
          ...(type === 'document' && normalizedMimeType
            ? { mimeType: normalizedMimeType }
            : {}),
          ...(type === 'document' && normalizedSize != null
            ? { size: normalizedSize }
            : {}),
          ...(order != null ? { order } : {}),
        })
        .link({ [linkField]: linkId })
    );
  } catch (error) {
    if (assetKey) {
      await deleteFileAssets(env, [{ assetKey, uri }]).catch((deleteError) => {
        console.error('Failed to clean up unused file upload', {
          assetKey,
          error: deleteError,
        });
      });
    }

    throw error;
  }

  return { assetKey, fileId, type, uri };
};

export const createDirectVideoUploadDraft = async ({
  creatorId,
  db: dbClient,
  env,
  linkField,
  linkId,
  fileId: clientFileId,
  order,
  recordId,
}: {
  creatorId: string;
  db: Db;
  env: CloudflareEnv;
  linkField: 'reply' | 'record';
  linkId: string;
  fileId?: string;
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

  const fileId = clientFileId || id();

  const { uid, uploadURL } = await cloudflareStream.createDirectVideoUpload(
    env,
    {
      creator: creatorId,
      maxDurationSeconds: DIRECT_VIDEO_UPLOAD_MAX_DURATION_SECONDS,
    }
  );

  try {
    await dbClient.transact(
      dbClient.tx.files[fileId]
        .update({
          assetKey: uid,
          type: 'video',
          uri: `${PENDING_STREAM_URI_PREFIX}${uid}`,
          ...(order != null ? { order } : {}),
        })
        .link({ [linkField]: linkId })
    );
  } catch (error) {
    await cloudflareStream.deleteStreamVideo(env, uid).catch((deleteError) => {
      console.error('Failed to clean up unused Stream upload', {
        error: deleteError,
        uid,
      });
    });

    throw error;
  }

  return { fileId, streamUid: uid, uploadURL };
};

export const fileValidator = zValidator(
  'form',
  z.object({
    duration: z.coerce.number().optional(),
    file: fileLike,
    fileName: z.string().optional(),
    fileId: z.string().optional(),
    mimeType: z.string().optional(),
    order: z.coerce.number().optional(),
    size: z.coerce.number().optional(),
  })
);

export const directVideoUploadValidator = zValidator(
  'json',
  z.object({
    fileId: z.string().optional(),
    order: z.coerce.number().optional(),
  })
);
