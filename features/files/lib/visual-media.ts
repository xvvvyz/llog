import { getFileSourceUri } from '@/features/files/lib/file-uri-to-src';

export const getThumbnailUri = ({
  assetKey,
  thumbnailUri,
  type,
  uri,
}: {
  assetKey?: string | null;
  thumbnailUri?: string | null;
  type?: string | null;
  uri?: string | null;
}) =>
  type === 'video'
    ? (thumbnailUri ?? null)
    : getFileSourceUri({ assetKey, uri });

export const isProcessing = ({
  thumbnailUri,
  type,
}: {
  thumbnailUri?: string | null;
  type?: string | null;
}) => type === 'video' && !thumbnailUri;

export const getThumbnailTargetWidth = (visualMediaCount: number) =>
  visualMediaCount === 1 ? 1024 : 512;
