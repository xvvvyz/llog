import { fileLike } from '@/domain/files/file-like';
import * as r2Multipart from '@/domain/files/r2-multipart';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod/v4';

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
    size: z.coerce.number().optional(),
  })
);

const r2MultipartUploadMetadata = {
  duration: z.coerce.number().optional(),
  fileName: z.string().optional(),
  fileId: z.string().optional(),
  mimeType: z.string().optional(),
  order: z.coerce.number().optional(),
  size: z.coerce.number().optional(),
  type: z.enum(['audio', 'document']),
};

const r2MultipartUploadedPart = z.object({
  etag: z.string().min(1),
  partNumber: z.coerce
    .number()
    .int()
    .min(1)
    .max(r2Multipart.R2_MULTIPART_MAX_PARTS),
});

export const r2MultipartUploadValidator = zValidator(
  'json',
  z.object(r2MultipartUploadMetadata)
);

export const r2MultipartUploadPartValidator = zValidator(
  'query',
  z.object({
    encoding: z.enum(['base64', 'binary']).optional(),
    fileId: z.string().min(1),
    partNumber: z.coerce
      .number()
      .int()
      .min(1)
      .max(r2Multipart.R2_MULTIPART_MAX_PARTS),
    uploadId: z.string().min(1),
  })
);

export const r2MultipartUploadCompleteValidator = zValidator(
  'json',
  z.object({
    ...r2MultipartUploadMetadata,
    fileId: z.string().min(1),
    parts: z
      .array(r2MultipartUploadedPart)
      .min(1)
      .max(r2Multipart.R2_MULTIPART_MAX_PARTS),
    uploadId: z.string().min(1),
  })
);

export const r2MultipartUploadAbortValidator = zValidator(
  'json',
  z.object({ fileId: z.string().min(1), uploadId: z.string().min(1) })
);
