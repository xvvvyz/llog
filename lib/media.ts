export const getVisualMediaThumbnailUri = ({
  thumbnailUri,
  type,
  uri,
}: {
  thumbnailUri?: string | null;
  type?: string | null;
  uri: string;
}) => (type === 'video' ? (thumbnailUri ?? null) : uri);

export const isVideoMediaProcessing = ({
  thumbnailUri,
  type,
}: {
  thumbnailUri?: string | null;
  type?: string | null;
}) => type === 'video' && !thumbnailUri;

export const getTimelineTargetWidth = (visualMediaCount: number) =>
  visualMediaCount === 1 ? 1024 : 512;
