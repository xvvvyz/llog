import type { R2MultipartFileKind } from '@/api/files/upload/types';
import { HTTPException } from 'hono/http-exception';

const DEFAULT_DOWNLOAD_FILE_NAME = 'download';

export const normalizeFileName = (fileName?: string | null) => {
  const value = fileName?.trim();
  return value || undefined;
};

export const normalizeMimeType = (mimeType?: string | null) => {
  const value = mimeType?.trim();
  return value || undefined;
};

export const normalizeFileSize = (size?: number) =>
  Number.isFinite(size) && size != null && size >= 0
    ? Math.round(size)
    : undefined;

export const normalizeOrder = (order?: number | null) =>
  Number.isFinite(order) && order != null ? Math.round(order) : undefined;

export const normalizeDuration = (duration?: number | null) =>
  Number.isFinite(duration) && duration != null && duration >= 0
    ? Math.round(duration)
    : undefined;

export const getContentDisposition = (fileName?: string) => {
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

export const decodeBase64UploadPart = (value: string) => {
  let binary = '';

  try {
    binary = atob(value.trim());
  } catch {
    throw new HTTPException(400, { message: 'Invalid upload part' });
  }

  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

export const r2MultipartHttpMetadata = ({
  fileName,
  mimeType,
  type,
}: {
  fileName?: string;
  mimeType?: string;
  type: R2MultipartFileKind;
}) => {
  const contentDisposition =
    type === 'document' ? getContentDisposition(fileName) : undefined;

  return {
    contentType: mimeType ?? 'application/octet-stream',
    ...(contentDisposition ? { contentDisposition } : {}),
  };
};
