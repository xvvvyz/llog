import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import * as video from '@/components/ui/video-player';
import { ZoomableMedia } from '@/components/ui/zoomable-media';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useUi } from '@/queries/use-ui';
import { Media } from '@/types/media';
import { clampIndex } from '@/utilities/clamp';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { preloadMedia } from '@/utilities/file-uri-to-src';
import { formatTime } from '@/utilities/format-time';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { SpeakerHigh } from 'phosphor-react-native/lib/module/icons/SpeakerHigh';
import { SpeakerSlash } from 'phosphor-react-native/lib/module/icons/SpeakerSlash';
import * as React from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import ReanimatedCarousel, {
  type ICarouselInstance,
} from 'react-native-reanimated-carousel';

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

        if (previewUri) void preloadMedia(previewUri);
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
          const isActive = index === activeIndexState;
          const isAdjacent = Math.abs(index - activeIndexState) <= 2;
          const shouldAutoPlay = videoPlaybackIntentState[item.id] ?? true;

          const previewUri =
            item.type === 'video' ? (item.thumbnailUri ?? null) : item.uri;

          return (
            <View
              className="items-center justify-center"
              key={item.id}
              style={{ width: contentWidth, height: contentHeight }}
            >
              {item.type === 'video' ? (
                <View className="bg-background relative w-full flex-1 items-center justify-center">
                  {!!previewUri && (
                    <Image
                      contentFit="contain"
                      fill
                      uri={previewUri}
                      wrapperClassName="bg-background"
                    />
                  )}
                  {isAdjacent ? (
                    <ZoomableMedia
                      disabledDoubleTapZoom
                      height={contentHeight}
                      onInteractionStateChange={(nextIsInteracting) =>
                        handleZoomInteractionStateChange(
                          item.id,
                          nextIsInteracting
                        )
                      }
                      onZoomStateChange={(nextIsZoomed) =>
                        handleZoomStateChange(item.id, nextIsZoomed)
                      }
                      resetToken={zoomResetTokens[item.id] ?? 0}
                      width={contentWidth}
                    >
                      <Pressable
                        className="flex-1 items-center justify-center self-stretch"
                        onPress={isActive ? handleTogglePlay : undefined}
                      >
                        <video.VideoPlayer
                          autoPlay={isActive && shouldAutoPlay}
                          handleRef={isActive ? videoHandleRef : undefined}
                          maxHeight={contentHeight}
                          maxWidth={contentWidth}
                          muted={isMuted}
                          onPlayingChange={isActive ? setIsPlaying : undefined}
                          onTimeChange={
                            isActive ? handleVideoTimeChange : undefined
                          }
                          resetToken={videoResetTokens[item.id] ?? 0}
                          thumbnailUri={item.thumbnailUri}
                          uri={item.uri}
                        />
                        {isActive && !isPlaying && !isScrubbingVideo && (
                          <View className="pointer-events-none absolute inset-0 items-center justify-center">
                            <View className="size-16 items-center justify-center rounded-full bg-black/50">
                              <Icon
                                className="text-white"
                                icon={Play}
                                size={28}
                                weight="fill"
                              />
                            </View>
                          </View>
                        )}
                      </Pressable>
                    </ZoomableMedia>
                  ) : null}
                </View>
              ) : (
                <ZoomableMedia
                  height={contentHeight}
                  onInteractionStateChange={(nextIsInteracting) =>
                    handleZoomInteractionStateChange(item.id, nextIsInteracting)
                  }
                  onZoomStateChange={(nextIsZoomed) =>
                    handleZoomStateChange(item.id, nextIsZoomed)
                  }
                  resetToken={zoomResetTokens[item.id] ?? 0}
                  width={contentWidth}
                >
                  <Image
                    contentFit="contain"
                    height={contentHeight}
                    uri={item.uri}
                    width={contentWidth}
                    wrapperClassName="bg-background"
                  />
                </ZoomableMedia>
              )}
            </View>
          );
        }}
        style={{ height: contentHeight, width: contentWidth }}
      />
      {isActiveVideo && (
        <>
          {!isSwiping && videoDuration > 0 && (
            <View
              className="absolute right-4 z-10 mr-0.5 items-end gap-1 md:right-8"
              style={{ bottom: videoButtonsBottomOffset }}
            >
              <Button
                className="size-11"
                onPress={handleToggleMute}
                size="icon"
                variant="link"
              >
                <Icon
                  className="color-foreground"
                  icon={isMuted ? SpeakerSlash : SpeakerHigh}
                  size={Platform.select({ default: 24, ios: 22 })}
                />
              </Button>
            </View>
          )}
          {!isSwiping && (
            <View
              className={cn(
                'absolute right-4 left-4 z-10 md:right-8 md:left-8',
                'h-8 justify-center px-3',
                videoDuration > 0
                  ? 'pointer-events-auto'
                  : 'pointer-events-none'
              )}
              style={{
                bottom: scrubberBottomOffset,
                opacity: videoDuration > 0 ? 1 : 0,
              }}
            >
              <VideoScrubber
                currentTime={videoCurrentTime}
                duration={videoDuration}
                onScrubEnd={commitVideoScrub}
                onScrubMove={previewVideoScrub}
                onScrubStart={startVideoScrub}
              />
            </View>
          )}
        </>
      )}
      <View
        className="pointer-events-none absolute right-4 left-4 z-10 items-center md:right-8 md:left-8"
        style={{ bottom: dotsBottomOffset }}
      >
        {media.length > 1 && (
          <Dots activeIndex={activeIndex} count={media.length} />
        )}
      </View>
    </View>
  );
};

const VideoScrubber = ({
  currentTime,
  duration,
  onScrubEnd,
  onScrubMove,
  onScrubStart,
}: {
  currentTime: number;
  duration: number;
  onScrubEnd: (seconds: number) => void;
  onScrubMove: (seconds: number) => void;
  onScrubStart: () => void;
}) => {
  const trackWidth = useSharedValue(0);

  const progress =
    duration > 0 ? Math.max(0, Math.min(currentTime / duration, 1)) : 0;

  const scrubTo = React.useCallback(
    (x: number) => {
      if (trackWidth.value <= 0 || duration <= 0) return;
      const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
      onScrubMove(fraction * duration);
    },
    [duration, onScrubMove, trackWidth]
  );

  const finishScrub = React.useCallback(
    (x: number) => {
      if (trackWidth.value <= 0 || duration <= 0) return;
      const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
      onScrubEnd(fraction * duration);
    },
    [duration, onScrubEnd, trackWidth]
  );

  const tap = React.useMemo(
    () =>
      Gesture.Tap().onEnd((e) => {
        'worklet';
        runOnJS(onScrubStart)();
        runOnJS(scrubTo)(e.x);
        runOnJS(finishScrub)(e.x);
      }),
    [finishScrub, onScrubStart, scrubTo]
  );

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .onStart((e) => {
          'worklet';
          runOnJS(onScrubStart)();
          runOnJS(scrubTo)(e.x);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(scrubTo)(e.x);
        })
        .onEnd((e) => {
          'worklet';
          runOnJS(finishScrub)(e.x);
        }),
    [finishScrub, onScrubStart, scrubTo]
  );

  const handleTrackLayout = React.useCallback(
    (e: LayoutChangeEvent) => {
      trackWidth.value = e.nativeEvent.layout.width;
    },
    [trackWidth]
  );

  return (
    <View className="flex-row items-center">
      <Text className="text-muted-foreground min-w-[40px] text-xs leading-4">
        {formatTime(currentTime)}
      </Text>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <Animated.View className="h-8 flex-1 justify-center self-stretch">
          <View
            className="bg-border relative h-1 overflow-hidden rounded-full"
            onLayout={handleTrackLayout}
          >
            <View
              className="bg-foreground absolute top-0 bottom-0 left-0 rounded-full"
              style={{
                width: `${progress * 100}%`,
              }}
            />
          </View>
        </Animated.View>
      </GestureDetector>
      <Text className="text-muted-foreground min-w-[40px] text-right text-xs leading-4">
        {formatTime(duration)}
      </Text>
    </View>
  );
};

const AnimatedDotView = Animated.createAnimatedComponent(View);

const MAX_DOTS = 5;
const DOT_SIZE = 8;
const DOT_GAP = 8;
const DOT_STEP = DOT_SIZE + DOT_GAP;

const Dots = ({
  activeIndex,
  count,
}: {
  activeIndex: SharedValue<number>;
  count: number;
}) => {
  const visibleCount = Math.min(count, MAX_DOTS);
  const containerWidth = visibleCount * DOT_SIZE + (visibleCount - 1) * DOT_GAP;

  return (
    <View className="h-2 overflow-hidden" style={{ width: containerWidth }}>
      <Animated.View className="flex-row" style={{ gap: DOT_GAP }}>
        {Array.from({ length: count }, (_, i) => (
          <Dot activeIndex={activeIndex} count={count} index={i} key={i} />
        ))}
      </Animated.View>
    </View>
  );
};

const Dot = ({
  activeIndex,
  count,
  index,
}: {
  activeIndex: SharedValue<number>;
  count: number;
  index: number;
}) => {
  const style = useAnimatedStyle(() => {
    const active = activeIndex.value;
    const half = Math.floor(MAX_DOTS / 2);
    const center = Math.max(half, Math.min(active, count - 1 - half));
    const offset = count <= MAX_DOTS ? 0 : -(center - half) * DOT_STEP;
    const dist = Math.abs(index - active);
    const clampedDist = Math.min(dist, 2);
    const scale = 1 - clampedDist * 0.25;
    const opacity = 1 - clampedDist * 0.3;
    const windowStart = center - half;
    const windowEnd = windowStart + MAX_DOTS - 1;

    const isVisible =
      count <= MAX_DOTS || (index >= windowStart && index <= windowEnd);

    return {
      opacity: isVisible ? opacity : 0,
      transform: [{ translateX: offset }, { scale }],
    };
  });

  return (
    <AnimatedDotView style={[{ width: DOT_SIZE, height: DOT_SIZE }, style]}>
      <View className="bg-foreground h-full w-full rounded-full shadow-xl" />
    </AnimatedDotView>
  );
};
