import { CAROUSEL_MEDIA_QUALITY } from '@/features/media/carousel-helpers';
import * as video from '@/features/media/video-player';
import { preloadMedia } from '@/lib/file-uri-to-src';
import { Media } from '@/types/media';
import * as React from 'react';

export const useCarouselPreloading = ({
  activeIndexRef,
  getClampedIndex,
  media,
}: {
  activeIndexRef: React.RefObject<number>;
  getClampedIndex: (index: number) => number;
  media: Media[];
}) => {
  const loadedMediaIdsRef = React.useRef(new Set<string>());
  const adjacentPreloadKeysRef = React.useRef(new Set<string>());

  const preloadAdjacentFromIndex = React.useCallback(
    (index: number) => {
      if (media.length === 0) return;
      const safeIndex = getClampedIndex(index);
      const targets = [safeIndex - 1, safeIndex + 1];

      targets.forEach((i) => {
        const item = media[i];
        if (!item) return;

        const previewUri = item.type === 'video' ? item.thumbnailUri : item.uri;

        if (previewUri) {
          void preloadMedia(previewUri, { quality: CAROUSEL_MEDIA_QUALITY });
        }

        if (item.type === 'video') {
          video.preloadVideo(item.uri);
        }
      });
    },
    [getClampedIndex, media]
  );

  const maybePreloadAdjacentFromIndex = React.useCallback(
    (index: number) => {
      if (media.length === 0) return;

      const safeIndex = getClampedIndex(index);
      const item = media[safeIndex];
      if (!item) return;
      if (!loadedMediaIdsRef.current.has(item.id)) return;

      const preloadKey = `${item.id}:${safeIndex}`;
      if (adjacentPreloadKeysRef.current.has(preloadKey)) return;
      adjacentPreloadKeysRef.current.add(preloadKey);
      preloadAdjacentFromIndex(safeIndex);
    },
    [getClampedIndex, media, preloadAdjacentFromIndex]
  );

  const handleActiveMediaLoad = React.useCallback(
    (mediaId: string, _index: number) => {
      loadedMediaIdsRef.current.add(mediaId);
      if (media[activeIndexRef.current]?.id !== mediaId) return;
      maybePreloadAdjacentFromIndex(activeIndexRef.current);
    },
    [activeIndexRef, media, maybePreloadAdjacentFromIndex]
  );

  React.useEffect(() => {
    const mediaIdSet = new Set(media.map((item) => item.id));

    loadedMediaIdsRef.current.forEach((mediaId) => {
      if (!mediaIdSet.has(mediaId)) loadedMediaIdsRef.current.delete(mediaId);
    });

    adjacentPreloadKeysRef.current.forEach((preloadKey) => {
      const mediaId = preloadKey.split(':', 1)[0];

      if (!mediaIdSet.has(mediaId)) {
        adjacentPreloadKeysRef.current.delete(preloadKey);
      }
    });
  }, [media]);

  return {
    handleActiveMediaLoad,
    maybePreloadAdjacentFromIndex,
  };
};
