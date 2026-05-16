import { deleteFileAssets } from '@/api/files/delete-file-assets';
import { getNextAttachmentOrder } from '@/api/files/upload/attachment-order';
import type { LinkField, R2MultipartFileKind } from '@/api/files/upload/types';
import { type Db } from '@/api/middleware/db';
import * as r2Multipart from '@/domain/files/r2-multipart';
import { id } from '@instantdb/admin';
import { HTTPException } from 'hono/http-exception';
import * as authorization from '@/api/files/upload/authorization';
import * as metadata from '@/api/files/upload/metadata';

export const createR2MultipartUploadDraft = async ({
  creatorId,
  db: dbClient,
  duration,
  env,
  fileName,
  keyPrefix,
  linkField,
  linkId,
  fileId: clientFileId,
  mimeType,
  order,
  recordId,
  size,
  type,
}: {
  creatorId: string;
  db: Db;
  duration?: number;
  env: CloudflareEnv;
  fileName?: string;
  keyPrefix: string;
  linkField: LinkField;
  linkId: string;
  fileId?: string;
  mimeType?: string;
  order?: number;
  recordId: string;
  size?: number;
  type: R2MultipartFileKind;
}) => {
  const fileId = clientFileId || id();

  await authorization.assertCanCreateFileUpload({
    creatorId,
    db: dbClient,
    fileId,
    linkField,
    linkId,
    recordId,
  });

  const normalizedName = metadata.normalizeFileName(fileName);
  const normalizedMimeType = metadata.normalizeMimeType(mimeType);

  const normalizedOrder =
    metadata.normalizeOrder(order) ??
    (await getNextAttachmentOrder({ db: dbClient, linkField, linkId }));

  const normalizedSize = metadata.normalizeFileSize(size);
  const normalizedDuration = metadata.normalizeDuration(duration);
  const baseKey = `${keyPrefix}/files/${fileId}`;

  const upload = await env.R2.createMultipartUpload(baseKey, {
    httpMetadata: metadata.r2MultipartHttpMetadata({
      fileName: normalizedName,
      mimeType: normalizedMimeType,
      type,
    }),
  });

  return {
    duration: normalizedDuration,
    fileId,
    fileName: normalizedName,
    mimeType: normalizedMimeType,
    order: normalizedOrder,
    partSize: r2Multipart.R2_MULTIPART_PART_SIZE,
    size: normalizedSize,
    type,
    uploadId: upload.uploadId,
  };
};

export const uploadR2MultipartPart = async ({
  creatorId,
  db: dbClient,
  encoding,
  env,
  keyPrefix,
  linkField,
  linkId,
  fileId,
  partNumber,
  recordId,
  request,
  uploadId,
}: {
  creatorId: string;
  db: Db;
  encoding?: 'base64' | 'binary';
  env: CloudflareEnv;
  keyPrefix: string;
  linkField: LinkField;
  linkId: string;
  fileId: string;
  partNumber: number;
  recordId: string;
  request: Request;
  uploadId: string;
}) => {
  await authorization.assertCanUploadToOwnedTarget({
    creatorId,
    db: dbClient,
    linkField,
    linkId,
    recordId,
  });

  await authorization.assertFileIdAvailable({ db: dbClient, fileId });
  const baseKey = `${keyPrefix}/files/${fileId}`;
  const upload = env.R2.resumeMultipartUpload(baseKey, uploadId);

  const value =
    encoding === 'base64'
      ? metadata.decodeBase64UploadPart(await request.text())
      : request.body;

  if (!value) throw new HTTPException(400, { message: 'Invalid upload part' });
  return upload.uploadPart(partNumber, value);
};

export const completeR2MultipartUpload = async ({
  creatorId,
  db: dbClient,
  duration,
  env,
  fileName,
  keyPrefix,
  linkField,
  linkId,
  fileId,
  mimeType,
  order,
  parts,
  recordId,
  size,
  uploadId,
  type,
}: {
  creatorId: string;
  db: Db;
  duration?: number;
  env: CloudflareEnv;
  fileName?: string;
  keyPrefix: string;
  linkField: LinkField;
  linkId: string;
  fileId: string;
  mimeType?: string;
  order?: number;
  parts: R2UploadedPart[];
  recordId: string;
  size?: number;
  uploadId: string;
  type: R2MultipartFileKind;
}) => {
  await authorization.assertCanCreateFileUpload({
    creatorId,
    db: dbClient,
    fileId,
    linkField,
    linkId,
    recordId,
  });

  const baseKey = `${keyPrefix}/files/${fileId}`;
  const normalizedDuration = metadata.normalizeDuration(duration);
  const normalizedName = metadata.normalizeFileName(fileName);
  const normalizedMimeType = metadata.normalizeMimeType(mimeType);

  const normalizedOrder =
    metadata.normalizeOrder(order) ??
    (await getNextAttachmentOrder({ db: dbClient, linkField, linkId }));

  const upload = env.R2.resumeMultipartUpload(baseKey, uploadId);

  const object = await upload.complete(
    [...parts].sort((a, b) => a.partNumber - b.partNumber)
  );

  const normalizedSize = metadata.normalizeFileSize(size ?? object.size);
  const assetKey = baseKey;

  try {
    await dbClient.transact(
      dbClient.tx.files[fileId]
        .update({
          assetKey,
          type,
          ...(type === 'audio' && normalizedDuration != null
            ? { duration: normalizedDuration }
            : {}),
          ...(type === 'document' && normalizedName
            ? { name: normalizedName }
            : {}),
          ...(normalizedMimeType ? { mimeType: normalizedMimeType } : {}),
          ...(normalizedSize != null ? { size: normalizedSize } : {}),
          order: normalizedOrder,
        })
        .link({ [linkField]: linkId })
    );
  } catch (error) {
    await deleteFileAssets(env, [{ assetKey }]).catch((deleteError) => {
      console.error('Failed to clean up unused multipart upload', {
        assetKey,
        error: deleteError,
      });
    });

    throw error;
  }

  return { assetKey, fileId, type };
};

export const abortR2MultipartUpload = async ({
  creatorId,
  db: dbClient,
  env,
  keyPrefix,
  linkField,
  linkId,
  fileId,
  recordId,
  uploadId,
}: {
  creatorId: string;
  db: Db;
  env: CloudflareEnv;
  keyPrefix: string;
  linkField: LinkField;
  linkId: string;
  fileId: string;
  recordId: string;
  uploadId: string;
}) => {
  await authorization.assertCanUploadToOwnedTarget({
    creatorId,
    db: dbClient,
    linkField,
    linkId,
    recordId,
  });

  const baseKey = `${keyPrefix}/files/${fileId}`;
  await env.R2.resumeMultipartUpload(baseKey, uploadId).abort();
};
