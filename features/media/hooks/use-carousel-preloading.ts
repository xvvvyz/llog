import { Media } from '@/features/media/types/media';
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

  const [isActiveMediaLoading, setIsActiveMediaLoading] = React.useState(() => {
    const activeMediaId = media[activeIndexRef.current]?.id;

    return activeMediaId
      ? !loadedMediaIdsRef.current.has(activeMediaId)
      : false;
  });

  const syncActiveMediaLoadingState = React.useCallback(
    (index: number) => {
      if (media.length === 0) {
        setIsActiveMediaLoading(false);
        return;
      }

      const safeIndex = getClampedIndex(index);
      const mediaId = media[safeIndex]?.id;

      setIsActiveMediaLoading(
        Boolean(mediaId) && !loadedMediaIdsRef.current.has(mediaId)
      );
    },
    [getClampedIndex, media]
  );

  const handleActiveMediaLoad = React.useCallback(
    (mediaId: string, _index: number) => {
      loadedMediaIdsRef.current.add(mediaId);
      if (media[activeIndexRef.current]?.id !== mediaId) return;
      setIsActiveMediaLoading(false);
    },
    [activeIndexRef, media]
  );

  React.useEffect(() => {
    const mediaIdSet = new Set(media.map((item) => item.id));

    loadedMediaIdsRef.current.forEach((mediaId) => {
      if (!mediaIdSet.has(mediaId)) loadedMediaIdsRef.current.delete(mediaId);
    });
    syncActiveMediaLoadingState(activeIndexRef.current);
  }, [activeIndexRef, media, syncActiveMediaLoadingState]);

  return {
    handleActiveMediaLoad,
    isActiveMediaLoading,
    syncActiveMediaLoadingState,
  };
};
