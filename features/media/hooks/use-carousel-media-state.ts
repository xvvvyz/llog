import { pruneStateMap } from '@/features/media/lib/carousel-helpers';
import { Media } from '@/features/media/types/media';
import * as React from 'react';

export const useCarouselMediaState = ({
  activeIndexState,
  isSwiping,
  media,
}: {
  activeIndexState: number;
  isSwiping: boolean;
  media: Media[];
}) => {
  const [zoomedMediaState, setZoomedMediaState] = React.useState<
    Record<string, boolean>
  >({});

  const [zoomInteractionState, setZoomInteractionState] = React.useState<
    Record<string, boolean>
  >({});

  const [zoomResetTokens, setZoomResetTokens] = React.useState<
    Record<string, number>
  >({});

  const [videoResetTokens, setVideoResetTokens] = React.useState<
    Record<string, number>
  >({});

  const [videoPlaybackIntentState, setVideoPlaybackIntentState] =
    React.useState<Record<string, boolean>>({});

  const videoPlaybackIntentStateRef = React.useRef<Record<string, boolean>>({});
  const zoomedMediaStateRef = React.useRef<Record<string, boolean>>({});
  const zoomInteractionStateRef = React.useRef<Record<string, boolean>>({});
  const activeMediaId = media[activeIndexState]?.id;

  const isActiveNavigationLocked = activeMediaId
    ? (zoomedMediaState[activeMediaId] ?? false) ||
      (zoomInteractionState[activeMediaId] ?? false)
    : false;

  const isTransitionZoomLocked =
    isSwiping &&
    media.some(
      (item, index) =>
        Math.abs(index - activeIndexState) <= 1 &&
        ((zoomedMediaState[item.id] ?? false) ||
          (zoomInteractionState[item.id] ?? false))
    );

  const isNavigationLocked = isActiveNavigationLocked || isTransitionZoomLocked;
  const mediaIds = React.useMemo(() => media.map((item) => item.id), [media]);

  const setVideoPlaybackIntent = React.useCallback(
    (mediaId: string, shouldPlay: boolean) => {
      setVideoPlaybackIntentState((currentState) => {
        if ((currentState[mediaId] ?? true) === shouldPlay) return currentState;
        const nextState = { ...currentState, [mediaId]: shouldPlay };
        videoPlaybackIntentStateRef.current = nextState;
        return nextState;
      });
    },
    []
  );

  const shouldAutoPlayVideo = React.useCallback((mediaId?: string) => {
    if (!mediaId) return false;
    return videoPlaybackIntentStateRef.current[mediaId] ?? true;
  }, []);

  React.useEffect(() => {
    const mediaIdSet = new Set(mediaIds);

    setZoomedMediaState((currentState) => {
      const nextState = pruneStateMap(currentState, mediaIdSet);
      zoomedMediaStateRef.current = nextState;
      return nextState;
    });

    setZoomInteractionState((currentState) => {
      const nextState = pruneStateMap(currentState, mediaIdSet);
      zoomInteractionStateRef.current = nextState;
      return nextState;
    });

    setZoomResetTokens((currentState) =>
      pruneStateMap(currentState, mediaIdSet)
    );

    setVideoResetTokens((currentState) =>
      pruneStateMap(currentState, mediaIdSet)
    );

    setVideoPlaybackIntentState((currentState) => {
      const nextState = pruneStateMap(currentState, mediaIdSet);
      videoPlaybackIntentStateRef.current = nextState;
      return nextState;
    });
  }, [mediaIds]);

  const handleZoomStateChange = React.useCallback(
    (mediaId: string, nextIsZoomed: boolean) => {
      setZoomedMediaState((currentState) => {
        if ((currentState[mediaId] ?? false) === nextIsZoomed) {
          return currentState;
        }

        const nextState = { ...currentState, [mediaId]: nextIsZoomed };
        zoomedMediaStateRef.current = nextState;
        return nextState;
      });
    },
    []
  );

  const handleZoomInteractionStateChange = React.useCallback(
    (mediaId: string, nextIsInteracting: boolean) => {
      setZoomInteractionState((currentState) => {
        if ((currentState[mediaId] ?? false) === nextIsInteracting) {
          return currentState;
        }

        const nextState = { ...currentState, [mediaId]: nextIsInteracting };
        zoomInteractionStateRef.current = nextState;
        return nextState;
      });
    },
    []
  );

  const handleHiddenMedia = React.useCallback(
    (mediaId: string) => {
      const hiddenMedia = media.find((item) => item.id === mediaId);

      if (hiddenMedia?.type === 'video') {
        setVideoResetTokens((currentState) => ({
          ...currentState,
          [mediaId]: (currentState[mediaId] ?? 0) + 1,
        }));
      }

      const isZoomed = zoomedMediaStateRef.current[mediaId] ?? false;
      const isInteracting = zoomInteractionStateRef.current[mediaId] ?? false;
      if (!isZoomed && !isInteracting) return;

      setZoomResetTokens((currentState) => ({
        ...currentState,
        [mediaId]: (currentState[mediaId] ?? 0) + 1,
      }));

      setZoomedMediaState((currentState) => {
        if (!(currentState[mediaId] ?? false)) return currentState;
        const nextState = { ...currentState, [mediaId]: false };
        zoomedMediaStateRef.current = nextState;
        return nextState;
      });

      setZoomInteractionState((currentState) => {
        if (!(currentState[mediaId] ?? false)) return currentState;
        const nextState = { ...currentState, [mediaId]: false };
        zoomInteractionStateRef.current = nextState;
        return nextState;
      });
    },
    [media]
  );

  return {
    handleHiddenMedia,
    handleZoomInteractionStateChange,
    handleZoomStateChange,
    isNavigationLocked,
    setVideoPlaybackIntent,
    shouldAutoPlayVideo,
    videoPlaybackIntentState,
    videoResetTokens,
    zoomResetTokens,
  };
};
