import { pruneStateMap } from '@/features/files/lib/carousel';
import { FileItem } from '@/features/files/types/file';
import * as React from 'react';

export const useCarouselMediaState = ({
  activeIndexState,
  isSwiping,
  files,
}: {
  activeIndexState: number;
  isSwiping: boolean;
  files: FileItem[];
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
  const activeFileId = files[activeIndexState]?.id;

  const isActiveNavigationLocked = activeFileId
    ? (zoomedMediaState[activeFileId] ?? false) ||
      (zoomInteractionState[activeFileId] ?? false)
    : false;

  const isTransitionZoomLocked =
    isSwiping &&
    files.some(
      (item, index) =>
        Math.abs(index - activeIndexState) <= 1 &&
        ((zoomedMediaState[item.id] ?? false) ||
          (zoomInteractionState[item.id] ?? false))
    );

  const isNavigationLocked = isActiveNavigationLocked || isTransitionZoomLocked;
  const fileIds = React.useMemo(() => files.map((item) => item.id), [files]);

  const setVideoPlaybackIntent = React.useCallback(
    (fileId: string, shouldPlay: boolean) => {
      setVideoPlaybackIntentState((currentState) => {
        if ((currentState[fileId] ?? true) === shouldPlay) return currentState;
        const nextState = { ...currentState, [fileId]: shouldPlay };
        videoPlaybackIntentStateRef.current = nextState;
        return nextState;
      });
    },
    []
  );

  const shouldAutoPlayVideo = React.useCallback((fileId?: string) => {
    if (!fileId) return false;
    return videoPlaybackIntentStateRef.current[fileId] ?? true;
  }, []);

  React.useEffect(() => {
    const fileIdSet = new Set(fileIds);

    setZoomedMediaState((currentState) => {
      const nextState = pruneStateMap(currentState, fileIdSet);
      zoomedMediaStateRef.current = nextState;
      return nextState;
    });

    setZoomInteractionState((currentState) => {
      const nextState = pruneStateMap(currentState, fileIdSet);
      zoomInteractionStateRef.current = nextState;
      return nextState;
    });

    setZoomResetTokens((currentState) =>
      pruneStateMap(currentState, fileIdSet)
    );

    setVideoResetTokens((currentState) =>
      pruneStateMap(currentState, fileIdSet)
    );

    setVideoPlaybackIntentState((currentState) => {
      const nextState = pruneStateMap(currentState, fileIdSet);
      videoPlaybackIntentStateRef.current = nextState;
      return nextState;
    });
  }, [fileIds]);

  const handleZoomStateChange = React.useCallback(
    (fileId: string, nextIsZoomed: boolean) => {
      setZoomedMediaState((currentState) => {
        if ((currentState[fileId] ?? false) === nextIsZoomed) {
          return currentState;
        }

        const nextState = { ...currentState, [fileId]: nextIsZoomed };
        zoomedMediaStateRef.current = nextState;
        return nextState;
      });
    },
    []
  );

  const handleZoomInteractionStateChange = React.useCallback(
    (fileId: string, nextIsInteracting: boolean) => {
      setZoomInteractionState((currentState) => {
        if ((currentState[fileId] ?? false) === nextIsInteracting) {
          return currentState;
        }

        const nextState = { ...currentState, [fileId]: nextIsInteracting };
        zoomInteractionStateRef.current = nextState;
        return nextState;
      });
    },
    []
  );

  const handleHiddenMedia = React.useCallback(
    (fileId: string) => {
      const hiddenMedia = files.find((item) => item.id === fileId);

      if (hiddenMedia?.type === 'video') {
        setVideoResetTokens((currentState) => ({
          ...currentState,
          [fileId]: (currentState[fileId] ?? 0) + 1,
        }));
      }

      const isZoomed = zoomedMediaStateRef.current[fileId] ?? false;
      const isInteracting = zoomInteractionStateRef.current[fileId] ?? false;
      if (!isZoomed && !isInteracting) return;

      setZoomResetTokens((currentState) => ({
        ...currentState,
        [fileId]: (currentState[fileId] ?? 0) + 1,
      }));

      setZoomedMediaState((currentState) => {
        if (!(currentState[fileId] ?? false)) return currentState;
        const nextState = { ...currentState, [fileId]: false };
        zoomedMediaStateRef.current = nextState;
        return nextState;
      });

      setZoomInteractionState((currentState) => {
        if (!(currentState[fileId] ?? false)) return currentState;
        const nextState = { ...currentState, [fileId]: false };
        zoomInteractionStateRef.current = nextState;
        return nextState;
      });
    },
    [files]
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
