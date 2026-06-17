import * as cloudflareStream from '@/api/files/cloudflare-stream';
import { getNextAttachmentOrder } from '@/api/files/upload/attachment-order';
import { assertCanCreateFileUpload } from '@/api/files/upload/authorization';
import { normalizeFileSize, normalizeOrder } from '@/api/files/upload/metadata';
import type { LinkField } from '@/api/files/upload/types';
import { type Db } from '@/api/middleware/db';
import { id } from '@instantdb/admin';
import { HTTPException } from 'hono/http-exception';

const PENDING_STREAM_URI_PREFIX = 'stream-pending:';
const MAX_STREAM_UPLOAD_DURATION_SECONDS = 36000;

const DIRECT_VIDEO_UPLOAD_MAX_DURATION_SECONDS =
  MAX_STREAM_UPLOAD_DURATION_SECONDS;

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
  linkField: LinkField;
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

  // tus requires the total length up front (Upload-Length), so the client must
  // send the file size when starting a video upload.
  if (normalizedSize == null || normalizedSize <= 0) {
    throw new HTTPException(400, {
      message: 'A video size is required to start the upload',
    });
  }

  const { uid, uploadURL } = await cloudflareStream.createTusDirectVideoUpload(
    env,
    {
      creator: creatorId,
      maxDurationSeconds: DIRECT_VIDEO_UPLOAD_MAX_DURATION_SECONDS,
      uploadLength: normalizedSize,
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
