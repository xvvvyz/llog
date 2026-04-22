import { CarouselDots } from '@/features/media/carousel-dots';
import * as carouselHelpers from '@/features/media/carousel-helpers';
import { CarouselItem } from '@/features/media/carousel-item';
import { CarouselVideoControls } from '@/features/media/carousel-video-controls';
import { useCarouselLayout } from '@/features/media/use-carousel-layout';
import { useCarouselMediaState } from '@/features/media/use-carousel-media-state';
import { useCarouselPreloading } from '@/features/media/use-carousel-preloading';
import { useCarouselVideoControls } from '@/features/media/use-carousel-video-controls';
import type { VideoPlayerHandle } from '@/features/media/video-player';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { clampIndex } from '@/lib/clamp';
import { cn } from '@/lib/cn';
import { Media } from '@/types/media';
import * as React from 'react';
import { Platform, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import ReanimatedCarousel, {
  type ICarouselInstance,
} from 'react-native-reanimated-carousel';

export const Carousel = ({
  className,
  defaultIndex = 0,
  media,
  isKeyboardNavigationEnabled = false,
  onUiHiddenChange,
}: {
  className?: string;
  defaultIndex?: number;
  media: Media[];
  isKeyboardNavigationEnabled?: boolean;
  onUiHiddenChange?: (isHidden: boolean) => void;
}) => {
  const insets = useSafeAreaInsets();
  const carouselRef = React.useRef<ICarouselInstance>(null);
  const videoHandleRef = React.useRef<VideoPlayerHandle | null>(null);

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

  const [isPlaying, setIsPlaying] = React.useState(
    media[safeDefaultIndex]?.type === 'video'
  );

  const [activeIndexState, setActiveIndexState] =
    React.useState(safeDefaultIndex);

  const [isSwiping, setIsSwiping] = React.useState(false);

  const {
    handleHiddenMedia,
    handleZoomInteractionStateChange,
    handleZoomStateChange,
    isNavigationLocked,
    setVideoPlaybackIntent,
    shouldAutoPlayVideo,
    videoPlaybackIntentState,
    videoResetTokens,
    zoomResetTokens,
  } = useCarouselMediaState({
    activeIndexState,
    isSwiping,
    media,
  });

  const {
    commitVideoScrub,
    handleToggleMute,
    handleTogglePlay,
    handleVideoTimeChange,
    isMuted,
    isScrubbingVideo,
    previewVideoScrub,
    resetVideoUiState,
    startVideoScrub,
    videoCurrentTime,
    videoDuration,
  } = useCarouselVideoControls({
    activeIndexState,
    isPlaying,
    media,
    setIsPlaying,
    setVideoPlaybackIntent,
    videoHandleRef,
  });

  const {
    contentHeight,
    contentWidth,
    handleConfigurePanGesture,
    handleLayout,
  } = useCarouselLayout({
    activeIndex: activeIndexState,
    carouselRef,
  });

  const { handleActiveMediaLoad, maybePreloadAdjacentFromIndex } =
    useCarouselPreloading({
      activeIndexRef,
      getClampedIndex,
      media,
    });

  const getDominantIndex = React.useCallback(
    (absoluteProgress: number) =>
      carouselHelpers.getDominantCarouselIndex(absoluteProgress, media.length),
    [media.length]
  );

  const getVisibleMediaIds = React.useCallback(
    (absoluteProgress: number) =>
      carouselHelpers.getVisibleCarouselMediaIds(media, absoluteProgress),
    [media]
  );

  const visibleMediaIdsRef = React.useRef(
    carouselHelpers.getVisibleCarouselMediaIds(media, safeDefaultIndex)
  );

  const dotsBottomOffset = 12 + insets.bottom;
  const scrubberBottomOffset = 44 + insets.bottom;
  const videoButtonsBottomOffset = 88 + insets.bottom;
  const isActiveVideo = media[activeIndexState]?.type === 'video';
  const shouldHideUi = isActiveVideo && isPlaying;

  const carouselStyle = React.useMemo(
    () => ({ height: contentHeight, width: contentWidth }),
    [contentHeight, contentWidth]
  );

  React.useEffect(() => {
    onUiHiddenChange?.(shouldHideUi);

    return () => {
      onUiHiddenChange?.(false);
    };
  }, [onUiHiddenChange, shouldHideUi]);

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

    maybePreloadAdjacentFromIndex(nextIndex);
  }, [
    activeIndex,
    getClampedIndex,
    getVisibleMediaIds,
    media,
    maybePreloadAdjacentFromIndex,
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

    maybePreloadAdjacentFromIndex(safeDefaultIndex);
  }, [
    activeIndex,
    getVisibleMediaIds,
    media,
    maybePreloadAdjacentFromIndex,
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

      maybePreloadAdjacentFromIndex(index);
    },
    [
      media,
      maybePreloadAdjacentFromIndex,
      resetVideoUiState,
      shouldAutoPlayVideo,
    ]
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

  const renderCarouselItem = React.useCallback(
    ({ index, item }: { index: number; item: Media }) => {
      const shouldAutoPlay = videoPlaybackIntentState[item.id] ?? true;

      return (
        <CarouselItem
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          index={index}
          isMuted={isMuted}
          isPlaying={isPlaying}
          isScrubbingVideo={isScrubbingVideo}
          onActiveMediaLoad={handleActiveMediaLoad}
          item={item}
          mediaQuality={carouselHelpers.CAROUSEL_MEDIA_QUALITY}
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
    },
    [
      activeIndexState,
      contentHeight,
      contentWidth,
      handleActiveMediaLoad,
      handleTogglePlay,
      handleVideoTimeChange,
      handleZoomInteractionStateChange,
      handleZoomStateChange,
      isMuted,
      isPlaying,
      isScrubbingVideo,
      setIsPlaying,
      videoPlaybackIntentState,
      videoResetTokens,
      zoomResetTokens,
    ]
  );

  return (
    <View className={cn('relative flex-1', className)} onLayout={handleLayout}>
      {contentWidth > 0 && contentHeight > 0 ? (
        <ReanimatedCarousel
          data={media}
          defaultIndex={safeDefaultIndex}
          enabled={!isNavigationLocked && media.length > 1}
          height={contentHeight}
          loop={false}
          onConfigurePanGesture={handleConfigurePanGesture}
          onProgressChange={handleProgressChange}
          onScrollEnd={handleCarouselScrollEnd}
          onScrollStart={handleCarouselScrollStart}
          ref={carouselRef}
          renderItem={renderCarouselItem}
          style={carouselStyle}
          width={contentWidth}
          windowSize={5}
        />
      ) : null}
      {isActiveVideo && !shouldHideUi && (
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
        {!shouldHideUi && media.length > 1 && (
          <CarouselDots activeIndex={activeIndex} count={media.length} />
        )}
      </View>
    </View>
  );
};
