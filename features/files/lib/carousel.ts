import { FileItem } from '@/features/files/types/file';

export const CAROUSEL_FILE_QUALITY = 90;
export const CAROUSEL_PRELOAD_DISTANCE = 2;
export const CAROUSEL_IMAGE_REQUEST_SCALE = 1.5;
export const CAROUSEL_IMAGE_MAX_TARGET_SIZE = 2560;

export const pruneStateMap = <T extends boolean | number>(
  currentState: Record<string, T>,
  allowedFileIds: Set<string>
) => {
  const nextEntries = Object.entries(currentState).filter(([fileId]) =>
    allowedFileIds.has(fileId)
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
  files: FileItem[],
  absoluteProgress: number
) => {
  if (files.length === 0) return new Set<string>();

  const clampedProgress = Math.max(
    0,
    Math.min(files.length - 1, absoluteProgress)
  );

  const visibleMediaIds = new Set<string>();
  const floorIndex = Math.floor(clampedProgress);
  const ceilIndex = Math.ceil(clampedProgress);

  [floorIndex, ceilIndex].forEach((index) => {
    const fileId = files[index]?.id;
    if (fileId) visibleMediaIds.add(fileId);
  });

  return visibleMediaIds;
};
