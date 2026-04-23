import { CarouselDots } from '@/features/media/components/carousel-dots';
import { CarouselItem } from '@/features/media/components/carousel-item';
import { CarouselVideoControls } from '@/features/media/components/carousel-video-controls';
import type { VideoPlayerHandle } from '@/features/media/components/video-player';
import { useCarouselLayout } from '@/features/media/hooks/use-carousel-layout';
import { useCarouselMediaState } from '@/features/media/hooks/use-carousel-media-state';
import { useCarouselPreloading } from '@/features/media/hooks/use-carousel-preloading';
import { useCarouselVideoControls } from '@/features/media/hooks/use-carousel-video-controls';
import * as carouselHelpers from '@/features/media/lib/carousel-helpers';
import { Media } from '@/features/media/types/media';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { clampIndex } from '@/lib/clamp';
import { Spinner } from '@/ui/spinner';
import * as React from 'react';
import { Platform, View } from 'react-native';

import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import ReanimatedCarousel, {
  type ICarouselInstance,
} from 'react-native-reanimated-carousel';

export const Carousel = ({
  defaultIndex = 0,
  dismissMediaOpacity,
  dismissMediaTranslateY,
  dismissOverlayOpacity,
  isDismissGestureActive = false,
  media,
  isKeyboardNavigationEnabled = false,
  onDismissLockChange,
  onUiHiddenChange,
}: {
  defaultIndex?: number;
  dismissMediaOpacity?: SharedValue<number>;
  dismissMediaTranslateY?: SharedValue<number>;
  dismissOverlayOpacity?: SharedValue<number>;
  isDismissGestureActive?: boolean;
  media: Media[];
  isKeyboardNavigationEnabled?: boolean;
  onDismissLockChange?: (isLocked: boolean) => void;
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
  const carouselGestureStartIndexRef = React.useRef<number | null>(null);
  const dismissGestureLockIndexRef = React.useRef<number | null>(null);
  const isDismissGestureActiveRef = React.useRef(isDismissGestureActive);
  isDismissGestureActiveRef.current = isDismissGestureActive;

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

  const {
    handleActiveMediaLoad,
    isActiveMediaLoading,
    syncActiveMediaLoadingState,
  } = useCarouselPreloading({
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
  const activeMedia = media[activeIndexState];
  const isActiveVideo = activeMedia?.type === 'video';

  const showImageLoadingIndicator =
    activeMedia?.type === 'image' && isActiveMediaLoading;

  const shouldHideUi = isActiveVideo && isPlaying;

  const carouselStyle = React.useMemo(
    () => ({ height: contentHeight, width: contentWidth }),
    [contentHeight, contentWidth]
  );

  const mediaLayerStyle = useAnimatedStyle(() => ({
    opacity: dismissMediaOpacity?.value ?? 1,
    transform: [{ translateY: dismissMediaTranslateY?.value ?? 0 }],
  }));

  const overlayOpacityStyle = useAnimatedStyle(() => ({
    opacity: dismissOverlayOpacity?.value ?? 1,
  }));

  React.useEffect(() => {
    onUiHiddenChange?.(shouldHideUi);

    return () => {
      onUiHiddenChange?.(false);
    };
  }, [onUiHiddenChange, shouldHideUi]);

  React.useEffect(() => {
    onDismissLockChange?.(isNavigationLocked);
  }, [isNavigationLocked, onDismissLockChange]);

  React.useEffect(
    () => () => {
      onDismissLockChange?.(false);
    },
    [onDismissLockChange]
  );

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
    syncActiveMediaLoadingState(nextIndex);

    setIsPlaying(
      media[nextIndex]?.type === 'video' && shouldAutoPlayVideo(nextMediaId)
    );

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({
        animated: false,
        index: nextIndex,
      });
    });
  }, [
    activeIndex,
    getClampedIndex,
    getVisibleMediaIds,
    media,
    resetVideoUiState,
    shouldAutoPlayVideo,
    syncActiveMediaLoadingState,
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
    syncActiveMediaLoadingState(safeDefaultIndex);

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
  }, [
    activeIndex,
    getVisibleMediaIds,
    media,
    resetVideoUiState,
    safeDefaultIndex,
    shouldAutoPlayVideo,
    syncActiveMediaLoadingState,
  ]);

  React.useEffect(() => {
    if (
      !isKeyboardNavigationEnabled ||
      Platform.OS !== 'web' ||
      isDismissGestureActive
    ) {
      return;
    }

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
    isDismissGestureActive,
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
      syncActiveMediaLoadingState(index);

      setIsPlaying(
        media[index]?.type === 'video' && shouldAutoPlayVideo(media[index]?.id)
      );
    },
    [media, resetVideoUiState, shouldAutoPlayVideo, syncActiveMediaLoadingState]
  );

  const resetToDismissLockedIndex = React.useCallback(() => {
    const lockedIndex = getClampedIndex(
      dismissGestureLockIndexRef.current ??
        carouselGestureStartIndexRef.current ??
        activeIndexRef.current
    );

    dismissGestureLockIndexRef.current = lockedIndex;
    activeIndex.value = lockedIndex;
    const lockedVisibleMediaIds = getVisibleMediaIds(lockedIndex);

    visibleMediaIdsRef.current.forEach((mediaId) => {
      if (!lockedVisibleMediaIds.has(mediaId)) {
        handleHiddenMedia(mediaId);
      }
    });

    visibleMediaIdsRef.current = lockedVisibleMediaIds;
    syncActiveIndex(lockedIndex);

    carouselRef.current?.scrollTo({
      animated: false,
      index: lockedIndex,
    });

    return lockedIndex;
  }, [
    activeIndex,
    getClampedIndex,
    getVisibleMediaIds,
    handleHiddenMedia,
    syncActiveIndex,
  ]);

  React.useEffect(() => {
    if (!isDismissGestureActive) {
      dismissGestureLockIndexRef.current = null;
      carouselGestureStartIndexRef.current = null;
      return;
    }

    resetToDismissLockedIndex();
  }, [isDismissGestureActive, resetToDismissLockedIndex]);

  const handleProgressChange = React.useCallback(
    (_offsetProgress: number, absoluteProgress: number) => {
      if (!Number.isFinite(absoluteProgress)) return;

      if (isDismissGestureActiveRef.current) {
        activeIndex.value = getClampedIndex(
          dismissGestureLockIndexRef.current ??
            carouselGestureStartIndexRef.current ??
            activeIndexRef.current
        );

        return;
      }

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
      getClampedIndex,
      getDominantIndex,
      getVisibleMediaIds,
      handleHiddenMedia,
      syncActiveIndex,
    ]
  );

  const handleCarouselScrollStart = React.useCallback(() => {
    carouselGestureStartIndexRef.current = activeIndexRef.current;
    setIsSwiping(true);
  }, []);

  const handleCarouselScrollEnd = React.useCallback(
    (index: number) => {
      setIsSwiping(false);

      if (isDismissGestureActiveRef.current) {
        resetToDismissLockedIndex();
        return;
      }

      carouselGestureStartIndexRef.current = null;
      syncActiveIndex(index);
    },
    [resetToDismissLockedIndex, syncActiveIndex]
  );

  const renderCarouselItem = React.useCallback(
    ({ index, item }: { index: number; item: Media }) => {
      const shouldAutoPlay = videoPlaybackIntentState[item.id] ?? true;

      return (
        <CarouselItem
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          index={index}
          isActiveMediaLoading={isActiveMediaLoading}
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
      isActiveMediaLoading,
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
    <View className="relative flex-1" onLayout={handleLayout}>
      <Animated.View className="flex-1" style={mediaLayerStyle}>
        {contentWidth > 0 && contentHeight > 0 ? (
          <ReanimatedCarousel
            data={media}
            defaultIndex={safeDefaultIndex}
            enabled={
              !isNavigationLocked && !isDismissGestureActive && media.length > 1
            }
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
            windowSize={carouselHelpers.CAROUSEL_PRELOAD_DISTANCE * 2 + 1}
          />
        ) : null}
        {showImageLoadingIndicator && (
          <View className="pointer-events-none absolute inset-0 items-center justify-center">
            <Spinner />
          </View>
        )}
      </Animated.View>
      <Animated.View
        className="absolute inset-0"
        pointerEvents="box-none"
        style={overlayOpacityStyle}
      >
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
      </Animated.View>
      <Animated.View
        className="pointer-events-none absolute right-4 left-4 z-10 items-center md:right-8 md:left-8"
        style={[overlayOpacityStyle, { bottom: dotsBottomOffset }]}
      >
        {!shouldHideUi && media.length > 1 && (
          <CarouselDots activeIndex={activeIndex} count={media.length} />
        )}
      </Animated.View>
    </View>
  );
};
