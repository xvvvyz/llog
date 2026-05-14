import { getFileSourceUri } from '@/features/files/lib/file-uri-to-src';
import type { FileItem } from '@/features/files/types/file';

export const isLocalFileSourceUri = (uri?: string | null) =>
  !!uri && /^(blob|content|data|file):/i.test(uri);

export const isFileAvailableOffline = (file: FileItem) =>
  isLocalFileSourceUri(getFileSourceUri(file));
