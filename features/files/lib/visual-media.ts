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

// The server stamps a `stream-pending:` placeholder on a video's uri until
// Cloudflare Stream finishes encoding; it isn't a playable/local source.
const PENDING_STREAM_URI_PREFIX = 'stream-pending:';

export const isLocalPreviewableUri = (uri?: string | null) =>
  !!uri && !uri.startsWith(PENDING_STREAM_URI_PREFIX);

export const getThumbnailTargetWidth = (visualMediaCount: number) =>
  visualMediaCount === 1 ? 1024 : 512;
