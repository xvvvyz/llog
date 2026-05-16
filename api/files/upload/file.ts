import * as cloudflareImages from '@/api/files/cloudflare-images';
import { deleteFileAssets } from '@/api/files/delete-file-assets';
import { getNextAttachmentOrder } from '@/api/files/upload/attachment-order';
import { assertCanCreateFileUpload } from '@/api/files/upload/authorization';
import type { LinkField, MultipartFileKind } from '@/api/files/upload/types';
import { type Db } from '@/api/middleware/db';
import { fileLike } from '@/domain/files/file-like';
import { id } from '@instantdb/admin';
import { z } from 'zod/v4';
import * as metadata from '@/api/files/upload/metadata';
import * as fileValidation from '@/api/files/upload/file-validation';

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
  linkField: LinkField;
  linkId: string;
  fileId?: string;
  mimeType?: string;
  order?: number;
  recordId: string;
  size?: number;
}) => {
  const upload = fileValidation.requireUploadedFile(file);

  const type = fileValidation.validateUpload(upload, [
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

  const normalizedDuration = metadata.normalizeDuration(duration);
  const normalizedName = metadata.normalizeFileName(fileName ?? upload.name);

  const normalizedMimeType = metadata.normalizeMimeType(
    mimeType ?? upload.type
  );

  const normalizedOrder =
    metadata.normalizeOrder(order) ??
    (await getNextAttachmentOrder({ db: dbClient, linkField, linkId }));

  const normalizedSize = metadata.normalizeFileSize(size ?? upload.size);
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
      type === 'document'
        ? metadata.getContentDisposition(normalizedName)
        : undefined;

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
