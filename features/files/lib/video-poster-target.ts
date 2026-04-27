const DEFAULT_VIDEO_POSTER_ASPECT_RATIO = 16 / 9;

const isPositiveDimension = (value?: number): value is number =>
  value != null && Number.isFinite(value) && value > 0;

export const getVideoPosterTarget = ({
  maxHeight,
  maxWidth,
}: {
  maxHeight?: number;
  maxWidth?: number;
}): { targetHeight?: number; targetWidth?: number } => {
  if (isPositiveDimension(maxHeight) && isPositiveDimension(maxWidth)) {
    return maxWidth / maxHeight > DEFAULT_VIDEO_POSTER_ASPECT_RATIO
      ? { targetHeight: maxHeight }
      : { targetWidth: maxWidth };
  }

  if (isPositiveDimension(maxWidth)) return { targetWidth: maxWidth };
  if (isPositiveDimension(maxHeight)) return { targetHeight: maxHeight };
  return {};
};
