import * as cloudflareImages from '@/api/files/cloudflare-images';
import * as cloudflareStream from '@/api/files/cloudflare-stream';
import { deleteFileAssets } from '@/api/files/delete-file-assets';
import { type Db } from '@/api/middleware/db';
import type { FileKind } from '@/domain/files/file-kind';
import { fileLike } from '@/domain/files/file-like';
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

const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const DEFAULT_DOWNLOAD_FILE_NAME = 'download';

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

const normalizeOrder = (order?: number | null) =>
  Number.isFinite(order) && order != null ? Math.round(order) : undefined;

const getNextAttachmentOrder = async ({
  db: dbClient,
  linkField,
  linkId,
}: {
  db: Db;
  linkField: 'reply' | 'record';
  linkId: string;
}) => {
  if (linkField === 'record') {
    const { records } = await dbClient.query({
      records: {
        $: { fields: ['id'], where: { id: linkId } },
        files: { $: { fields: ['order'] } },
      },
    });

    return (
      (records[0]?.files ?? []).reduce(
        (max, file) => Math.max(max, normalizeOrder(file.order) ?? -1),
        -1
      ) + 1
    );
  }

  const { replies } = await dbClient.query({
    replies: {
      $: { fields: ['id'], where: { id: linkId } },
      files: { $: { fields: ['order'] } },
    },
  });

  return (
    (replies[0]?.files ?? []).reduce(
      (max, file) => Math.max(max, normalizeOrder(file.order) ?? -1),
      -1
    ) + 1
  );
};

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
        $: { fields: ['id', 'isDraft', 'teamId'], where: { id: recordId } },
        author: { user: { $: { fields: ['id'] } } },
        log: {
          $: { fields: ['id'] },
          team: {
            $: { fields: ['id'] },
            roles: { $: { fields: ['id'], where: { userId: creatorId } } },
          },
        },
      },
    });

    const record = records[0];
    const hasLogTeamRole = !!record?.log?.team?.roles?.[0]?.id;
    const isLoglessDraft = record?.isDraft && !record.log?.id;
    let hasTeamRole = hasLogTeamRole;

    if (!hasTeamRole && isLoglessDraft && record.teamId) {
      const { roles } = await dbClient.query({
        roles: {
          $: {
            fields: ['id'],
            where: { team: record.teamId, userId: creatorId },
          },
        },
      });

      hasTeamRole = !!roles[0]?.id;
    }

    if (!record?.id || record.author?.user?.id !== creatorId || !hasTeamRole) {
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

const assertFileIdAvailable = async ({
  db: dbClient,
  fileId,
}: {
  db: Db;
  fileId?: string;
}) => {
  if (!fileId) return;

  const { files } = await dbClient.query({
    files: { $: { fields: ['id'], where: { id: fileId } } },
  });

  if (files[0]?.id) {
    throw new HTTPException(409, { message: 'File ID already exists' });
  }
};

const assertCanCreateFileUpload = async ({
  creatorId,
  db: dbClient,
  fileId,
  linkField,
  linkId,
  recordId,
}: {
  creatorId: string;
  db: Db;
  fileId?: string;
  linkField: 'reply' | 'record';
  linkId: string;
  recordId: string;
}) => {
  await assertCanUploadToOwnedTarget({
    creatorId,
    db: dbClient,
    linkField,
    linkId,
    recordId,
  });

  await assertFileIdAvailable({ db: dbClient, fileId });
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

  const fileId = clientFileId || id();

  await assertCanCreateFileUpload({
    creatorId,
    db: dbClient,
    fileId,
    linkField,
    linkId,
    recordId,
  });

  const normalizedDuration =
    typeof duration === 'number' && Number.isFinite(duration) && duration >= 0
      ? Math.round(duration)
      : undefined;

  const normalizedName = normalizeFileName(fileName ?? upload.name);
  const normalizedMimeType = normalizeMimeType(mimeType ?? upload.type);

  const normalizedOrder =
    normalizeOrder(order) ??
    (await getNextAttachmentOrder({ db: dbClient, linkField, linkId }));

  const normalizedSize = normalizeFileSize(size ?? upload.size);
  const baseKey = `${keyPrefix}/files/${fileId}`;
  let assetKey: string | undefined;
  let uri: string | undefined;

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
          ...(uri ? { uri } : {}),
          ...(type === 'audio' && normalizedDuration != null
            ? { duration: normalizedDuration }
            : {}),
          ...(type === 'document' && normalizedName
            ? { name: normalizedName }
            : {}),
          ...((type === 'audio' || type === 'document') && normalizedMimeType
            ? { mimeType: normalizedMimeType }
            : {}),
          ...((type === 'audio' || type === 'document' || type === 'image') &&
          normalizedSize != null
            ? { size: normalizedSize }
            : {}),
          order: normalizedOrder,
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
  size,
}: {
  creatorId: string;
  db: Db;
  env: CloudflareEnv;
  linkField: 'reply' | 'record';
  linkId: string;
  fileId?: string;
  order?: number;
  recordId: string;
  size?: number;
}) => {
  const fileId = clientFileId || id();

  await assertCanCreateFileUpload({
    creatorId,
    db: dbClient,
    fileId,
    linkField,
    linkId,
    recordId,
  });

  const normalizedOrder =
    normalizeOrder(order) ??
    (await getNextAttachmentOrder({ db: dbClient, linkField, linkId }));

  const normalizedSize = normalizeFileSize(size);

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
          ...(normalizedSize != null ? { size: normalizedSize } : {}),
          order: normalizedOrder,
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
    audioOrigin: z.enum(['recorded', 'uploaded']).optional(),
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
    size: z.coerce.number().optional(),
  })
);
