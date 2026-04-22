import { CarouselDots } from '@/features/media/carousel-dots';
import { CarouselItem } from '@/features/media/carousel-item';
import { CarouselVideoControls } from '@/features/media/carousel-video-controls';
import * as video from '@/features/media/video-player';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { clampIndex } from '@/lib/clamp';
import { cn } from '@/lib/cn';
import { db } from '@/lib/db';
import { preloadMedia } from '@/lib/file-uri-to-src';
import { useUi } from '@/queries/use-ui';
import { Media } from '@/types/media';
import * as React from 'react';
import { Platform, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import ReanimatedCarousel, {
  type ICarouselInstance,
} from 'react-native-reanimated-carousel';

const CAROUSEL_MEDIA_QUALITY = 90;

const pruneStateMap = <T extends boolean | number>(
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

export const Carousel = ({
  className,
  defaultIndex = 0,
  media,
  isKeyboardNavigationEnabled = false,
}: {
  className?: string;
  defaultIndex?: number;
  media: Media[];
  isKeyboardNavigationEnabled?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const carouselRef = React.useRef<ICarouselInstance>(null);
  const windowDimensions = useWindowDimensions();
  const previousLayoutRef = React.useRef({ height: 0, width: 0 });
  const videoHandleRef = React.useRef<video.VideoPlayerHandle>(null);

  const getClampedIndex = React.useCallback(
    (index: number) => clampIndex(index, media.length),
    [media.length]
  );

  const safeDefaultIndex = getClampedIndex(defaultIndex);
  const activeIndex = useSharedValue(safeDefaultIndex);
  const activeIndexRef = React.useRef(safeDefaultIndex);

  const activeMediaIdRef = React.useRef<string | undefined>(
    media[safeDefaultIndex]?.id
  );

  const { id: uiId, videoMuted } = useUi();
  const [isMuted, setIsMuted] = React.useState(videoMuted);

  const [isPlaying, setIsPlaying] = React.useState(
    media[safeDefaultIndex]?.type === 'video'
  );

  const [activeIndexState, setActiveIndexState] =
    React.useState(safeDefaultIndex);

  const [isSwiping, setIsSwiping] = React.useState(false);
  const [isScrubbingVideo, setIsScrubbingVideo] = React.useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = React.useState(0);
  const [videoDuration, setVideoDuration] = React.useState(0);

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

  const isScrubbingVideoRef = React.useRef(false);
  const wasPlayingBeforeVideoScrubRef = React.useRef(false);
  const scrubPreviewFrameRef = React.useRef<number | null>(null);
  const scrubPreviewTargetRef = React.useRef<number | null>(null);
  const videoPlaybackIntentStateRef = React.useRef<Record<string, boolean>>({});
  const zoomedMediaStateRef = React.useRef<Record<string, boolean>>({});
  const zoomInteractionStateRef = React.useRef<Record<string, boolean>>({});

  const contentHeight = windowDimensions.height - insets.top - insets.bottom;
  const contentWidth = windowDimensions.width;
  const dotsBottomOffset = 12 + insets.bottom;
  const scrubberBottomOffset = 44 + insets.bottom;
  const videoButtonsBottomOffset = 88 + insets.bottom;
  const isActiveVideo = media[activeIndexState]?.type === 'video';
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
        if ((currentState[mediaId] ?? true) === shouldPlay) {
          return currentState;
        }

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

  const getDominantIndex = React.useCallback(
    (absoluteProgress: number) => {
      const clampedProgress = Math.max(
        0,
        Math.min(media.length - 1, absoluteProgress)
      );

      const baseIndex = Math.floor(clampedProgress);
      const fractionalProgress = clampedProgress - baseIndex;

      return fractionalProgress > 0.5
        ? Math.min(media.length - 1, baseIndex + 1)
        : baseIndex;
    },
    [media.length]
  );

  const getVisibleMediaIds = React.useCallback(
    (absoluteProgress: number) => {
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
    },
    [media]
  );
  const visibleMediaIdsRef = React.useRef(getVisibleMediaIds(safeDefaultIndex));

  const preloadFromIndex = React.useCallback(
    (index: number) => {
      if (media.length === 0) return;
      const safeIndex = getClampedIndex(index);

      const targets = [
        safeIndex,
        safeIndex - 1,
        safeIndex + 1,
        safeIndex - 2,
        safeIndex + 2,
      ];

      targets.forEach((i) => {
        const item = media[i];
        if (!item) return;

        const previewUri = item.type === 'video' ? item.thumbnailUri : item.uri;

        if (previewUri) {
          void preloadMedia(previewUri, { quality: CAROUSEL_MEDIA_QUALITY });
        }
        if (item.type === 'video') video.preloadVideo(item.uri);
      });
    },
    [getClampedIndex, media]
  );

  React.useEffect(() => {
    preloadFromIndex(safeDefaultIndex);
  }, [preloadFromIndex, safeDefaultIndex]);

  React.useEffect(() => {
    setIsMuted(videoMuted);
  }, [videoMuted]);

  React.useEffect(() => {
    return () => {
      if (scrubPreviewFrameRef.current != null) {
        cancelAnimationFrame(scrubPreviewFrameRef.current);
      }
    };
  }, []);

  const resetVideoUiState = React.useCallback(() => {
    if (scrubPreviewFrameRef.current != null) {
      cancelAnimationFrame(scrubPreviewFrameRef.current);
      scrubPreviewFrameRef.current = null;
    }

    scrubPreviewTargetRef.current = null;
    videoHandleRef.current?.setScrubbingEnabled(false);
    isScrubbingVideoRef.current = false;
    setIsScrubbingVideo(false);
    wasPlayingBeforeVideoScrubRef.current = false;
    setVideoCurrentTime(0);
    setVideoDuration(0);
  }, []);

  const setPage = React.useCallback(
    (index: number) => {
      carouselRef.current?.scrollTo({
        animated: true,
        index: getClampedIndex(index),
      });
    },
    [getClampedIndex]
  );

  React.useEffect(() => {
    if (contentWidth === 0 || contentHeight === 0) return;

    const previousLayout = previousLayoutRef.current;

    const hasLayoutChanged =
      previousLayout.width !== 0 &&
      (previousLayout.width !== contentWidth ||
        previousLayout.height !== contentHeight);

    previousLayoutRef.current = {
      height: contentHeight,
      width: contentWidth,
    };

    if (!hasLayoutChanged) return;

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({
        animated: false,
        index: activeIndexState,
      });
    });
  }, [activeIndexState, contentHeight, contentWidth]);

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

    if (media.length === 0) {
      resetVideoUiState();
      activeIndex.value = 0;
      activeIndexRef.current = 0;
      activeMediaIdRef.current = undefined;
      visibleMediaIdsRef.current = new Set();
      setActiveIndexState(0);
      setIsPlaying(false);
      return;
    }

    const currentMediaId = activeMediaIdRef.current;

    const preservedIndex = currentMediaId
      ? media.findIndex((item) => item.id === currentMediaId)
      : -1;

    const nextIndex =
      preservedIndex !== -1
        ? preservedIndex
        : getClampedIndex(activeIndexRef.current);

    const nextMediaId = media[nextIndex]?.id;

    visibleMediaIdsRef.current = getVisibleMediaIds(nextIndex);

    if (
      nextIndex === activeIndexRef.current &&
      nextMediaId === currentMediaId
    ) {
      return;
    }

    resetVideoUiState();
    activeIndex.value = nextIndex;
    activeIndexRef.current = nextIndex;
    activeMediaIdRef.current = nextMediaId;
    setActiveIndexState(nextIndex);
    setIsPlaying(
      media[nextIndex]?.type === 'video' && shouldAutoPlayVideo(nextMediaId)
    );

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({
        animated: false,
        index: nextIndex,
      });
    });

    preloadFromIndex(nextIndex);
  }, [
    activeIndex,
    getClampedIndex,
    getVisibleMediaIds,
    media,
    mediaIds,
    preloadFromIndex,
    resetVideoUiState,
    shouldAutoPlayVideo,
  ]);

  React.useEffect(() => {
    if (media.length === 0) return;
    if (safeDefaultIndex === activeIndexRef.current) return;

    const nextMediaId = media[safeDefaultIndex]?.id;

    resetVideoUiState();
    activeIndex.value = safeDefaultIndex;
    activeIndexRef.current = safeDefaultIndex;
    activeMediaIdRef.current = nextMediaId;
    visibleMediaIdsRef.current = getVisibleMediaIds(safeDefaultIndex);
    setActiveIndexState(safeDefaultIndex);
    setIsPlaying(
      media[safeDefaultIndex]?.type === 'video' &&
        shouldAutoPlayVideo(nextMediaId)
    );

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({
        animated: false,
        index: safeDefaultIndex,
      });
    });

    preloadFromIndex(safeDefaultIndex);
  }, [
    activeIndex,
    getVisibleMediaIds,
    media,
    preloadFromIndex,
    resetVideoUiState,
    safeDefaultIndex,
    shouldAutoPlayVideo,
  ]);

  React.useEffect(() => {
    if (!isKeyboardNavigationEnabled || Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isNavigationLocked) return;

      const currentIndex =
        carouselRef.current?.getCurrentIndex() ?? activeIndexState;

      if (event.key === 'ArrowLeft') {
        setPage(Math.max(0, currentIndex - 1));
      } else if (event.key === 'ArrowRight') {
        setPage(Math.min(media.length - 1, currentIndex + 1));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeIndexState,
    isKeyboardNavigationEnabled,
    isNavigationLocked,
    media.length,
    setPage,
  ]);

  const handleZoomStateChange = React.useCallback(
    (mediaId: string, nextIsZoomed: boolean) => {
      setZoomedMediaState((currentState) => {
        if ((currentState[mediaId] ?? false) === nextIsZoomed) {
          return currentState;
        }

        const nextState = {
          ...currentState,
          [mediaId]: nextIsZoomed,
        };

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

        const nextState = {
          ...currentState,
          [mediaId]: nextIsInteracting,
        };

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

      if (isZoomed || isInteracting) {
        setZoomResetTokens((currentState) => ({
          ...currentState,
          [mediaId]: (currentState[mediaId] ?? 0) + 1,
        }));
      }

      setZoomedMediaState((currentState) => {
        if (!(currentState[mediaId] ?? false)) return currentState;

        const nextState = {
          ...currentState,
          [mediaId]: false,
        };

        zoomedMediaStateRef.current = nextState;
        return nextState;
      });

      setZoomInteractionState((currentState) => {
        if (!(currentState[mediaId] ?? false)) return currentState;

        const nextState = {
          ...currentState,
          [mediaId]: false,
        };

        zoomInteractionStateRef.current = nextState;
        return nextState;
      });
    },
    [media]
  );

  const handleToggleMute = React.useCallback(() => {
    const muted = videoHandleRef.current?.toggleMute();

    if (muted != null) {
      setIsMuted(muted);
      if (uiId) db.transact(db.tx.ui[uiId].update({ videoMuted: muted }));
    }
  }, [uiId]);

  const handleTogglePlay = React.useCallback(() => {
    const activeMedia = media[activeIndexState];
    if (activeMedia?.type !== 'video') return;

    if (isPlaying) {
      videoHandleRef.current?.pause();
      setVideoPlaybackIntent(activeMedia.id, false);
      setIsPlaying(false);
      return;
    }

    setVideoPlaybackIntent(activeMedia.id, true);
    setIsPlaying(true);
    videoHandleRef.current?.play();
  }, [activeIndexState, isPlaying, media, setVideoPlaybackIntent]);

  const handleVideoTimeChange = React.useCallback(
    (currentTime: number, duration: number) => {
      if (isScrubbingVideoRef.current) return;
      setVideoCurrentTime(Math.max(0, currentTime));
      setVideoDuration(Math.max(0, duration));
    },
    []
  );

  const startVideoScrub = React.useCallback(() => {
    const handle = videoHandleRef.current;
    if (!handle || videoDuration <= 0) return;
    isScrubbingVideoRef.current = true;
    setIsScrubbingVideo(true);
    wasPlayingBeforeVideoScrubRef.current = isPlaying;
    handle.setScrubbingEnabled(true);

    if (isPlaying) {
      handle.pause();
    }
  }, [isPlaying, videoDuration]);

  const previewVideoScrub = React.useCallback(
    (seconds: number) => {
      const nextTime = Math.max(0, Math.min(seconds, videoDuration));
      scrubPreviewTargetRef.current = nextTime;
      if (scrubPreviewFrameRef.current != null) return;

      scrubPreviewFrameRef.current = requestAnimationFrame(() => {
        scrubPreviewFrameRef.current = null;
        const targetTime = scrubPreviewTargetRef.current;
        scrubPreviewTargetRef.current = null;
        if (targetTime == null) return;
        setVideoCurrentTime(targetTime);
        videoHandleRef.current?.seekTo(targetTime);
      });
    },
    [videoDuration]
  );

  const commitVideoScrub = React.useCallback(
    (seconds: number) => {
      const handle = videoHandleRef.current;
      const nextTime = Math.max(0, Math.min(seconds, videoDuration));
      const shouldResumePlayback = wasPlayingBeforeVideoScrubRef.current;

      if (scrubPreviewFrameRef.current != null) {
        cancelAnimationFrame(scrubPreviewFrameRef.current);
        scrubPreviewFrameRef.current = null;
      }

      scrubPreviewTargetRef.current = null;
      setVideoCurrentTime(nextTime);
      handle?.setScrubbingEnabled(false);
      handle?.seekTo(nextTime);
      isScrubbingVideoRef.current = false;
      setIsScrubbingVideo(false);

      if (shouldResumePlayback) {
        setIsPlaying(true);
        handle?.play();
      }
    },
    [videoDuration]
  );

  const syncActiveIndex = React.useCallback(
    (index: number) => {
      const previousIndex = activeIndexRef.current;

      if (index === previousIndex) return;

      resetVideoUiState();
      activeIndexRef.current = index;
      activeMediaIdRef.current = media[index]?.id;
      setActiveIndexState(index);
      setIsPlaying(
        media[index]?.type === 'video' && shouldAutoPlayVideo(media[index]?.id)
      );
      preloadFromIndex(index);
    },
    [media, preloadFromIndex, resetVideoUiState, shouldAutoPlayVideo]
  );

  const handleProgressChange = React.useCallback(
    (_offsetProgress: number, absoluteProgress: number) => {
      if (!Number.isFinite(absoluteProgress)) return;

      activeIndex.value = absoluteProgress;
      syncActiveIndex(getDominantIndex(absoluteProgress));
      const nextVisibleMediaIds = getVisibleMediaIds(absoluteProgress);

      visibleMediaIdsRef.current.forEach((mediaId) => {
        if (!nextVisibleMediaIds.has(mediaId)) {
          handleHiddenMedia(mediaId);
        }
      });

      visibleMediaIdsRef.current = nextVisibleMediaIds;
    },
    [
      activeIndex,
      getDominantIndex,
      getVisibleMediaIds,
      handleHiddenMedia,
      syncActiveIndex,
    ]
  );

  const handleCarouselScrollStart = React.useCallback(() => {
    setIsSwiping(true);
  }, []);

  const handleCarouselScrollEnd = React.useCallback(
    (index: number) => {
      setIsSwiping(false);
      syncActiveIndex(index);
    },
    [syncActiveIndex]
  );

  return (
    <View className={cn('relative flex-1', className)}>
      <ReanimatedCarousel
        data={media}
        defaultIndex={safeDefaultIndex}
        enabled={!isNavigationLocked && media.length > 1}
        loop={false}
        onProgressChange={handleProgressChange}
        onScrollEnd={handleCarouselScrollEnd}
        onScrollStart={handleCarouselScrollStart}
        ref={carouselRef}
        windowSize={5}
        renderItem={({ index, item }) => {
          const shouldAutoPlay = videoPlaybackIntentState[item.id] ?? true;

          return (
            <CarouselItem
              contentHeight={contentHeight}
              contentWidth={contentWidth}
              index={index}
              isMuted={isMuted}
              isPlaying={isPlaying}
              isScrubbingVideo={isScrubbingVideo}
              item={item}
              mediaQuality={CAROUSEL_MEDIA_QUALITY}
              onTogglePlay={handleTogglePlay}
              onVideoTimeChange={handleVideoTimeChange}
              onZoomInteractionStateChange={handleZoomInteractionStateChange}
              onZoomStateChange={handleZoomStateChange}
              resetVideoToken={videoResetTokens[item.id] ?? 0}
              resetZoomToken={zoomResetTokens[item.id] ?? 0}
              setIsPlaying={setIsPlaying}
              shouldAutoPlay={shouldAutoPlay}
              videoHandleRef={videoHandleRef}
              visibleIndex={activeIndexState}
            />
          );
        }}
        style={{ height: contentHeight, width: contentWidth }}
      />
      {isActiveVideo && (
        <CarouselVideoControls
          currentTime={videoCurrentTime}
          duration={videoDuration}
          isMuted={isMuted}
          isSwiping={isSwiping}
          onScrubEnd={commitVideoScrub}
          onScrubMove={previewVideoScrub}
          onScrubStart={startVideoScrub}
          onToggleMute={handleToggleMute}
          scrubberBottomOffset={scrubberBottomOffset}
          videoButtonsBottomOffset={videoButtonsBottomOffset}
        />
      )}
      <View
        className="pointer-events-none absolute right-4 left-4 z-10 items-center md:right-8 md:left-8"
        style={{ bottom: dotsBottomOffset }}
      >
        {media.length > 1 && (
          <CarouselDots activeIndex={activeIndex} count={media.length} />
        )}
      </View>
    </View>
  );
};
