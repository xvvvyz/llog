export const getThumbnailUri = ({
  thumbnailUri,
  type,
  uri,
}: {
  thumbnailUri?: string | null;
  type?: string | null;
  uri: string;
}) => (type === 'video' ? (thumbnailUri ?? null) : uri);

export const isProcessing = ({
  thumbnailUri,
  type,
}: {
  thumbnailUri?: string | null;
  type?: string | null;
}) => type === 'video' && !thumbnailUri;

export const getThumbnailTargetWidth = (visualMediaCount: number) =>
  visualMediaCount === 1 ? 1024 : 512;
