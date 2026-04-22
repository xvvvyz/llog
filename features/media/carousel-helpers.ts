import { Media } from '@/types/media';

export const CAROUSEL_MEDIA_QUALITY = 90;

export const pruneStateMap = <T extends boolean | number>(
  currentState: Record<string, T>,
  allowedMediaIds: Set<string>
) => {
  const nextEntries = Object.entries(currentState).filter(([mediaId]) =>
    allowedMediaIds.has(mediaId)
  );

  if (nextEntries.length === Object.keys(currentState).length) {
    return currentState;
  }

  return Object.fromEntries(nextEntries) as Record<string, T>;
};

export const getDominantCarouselIndex = (
  absoluteProgress: number,
  mediaCount: number
) => {
  if (mediaCount <= 0) return 0;

  const clampedProgress = Math.max(
    0,
    Math.min(mediaCount - 1, absoluteProgress)
  );
  const baseIndex = Math.floor(clampedProgress);
  const fractionalProgress = clampedProgress - baseIndex;

  return fractionalProgress > 0.5
    ? Math.min(mediaCount - 1, baseIndex + 1)
    : baseIndex;
};

export const getVisibleCarouselMediaIds = (
  media: Media[],
  absoluteProgress: number
) => {
  if (media.length === 0) return new Set<string>();

  const clampedProgress = Math.max(
    0,
    Math.min(media.length - 1, absoluteProgress)
  );

  const visibleMediaIds = new Set<string>();
  const floorIndex = Math.floor(clampedProgress);
  const ceilIndex = Math.ceil(clampedProgress);

  [floorIndex, ceilIndex].forEach((index) => {
    const mediaId = media[index]?.id;
    if (mediaId) visibleMediaIds.add(mediaId);
  });

  return visibleMediaIds;
};
