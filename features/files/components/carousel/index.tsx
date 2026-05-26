import { Dots } from '@/features/files/components/carousel/dots';
import { Item } from '@/features/files/components/carousel/item';
import { VideoControls } from '@/features/files/components/carousel/video-controls';
import { VideoMetadataOverlay } from '@/features/files/components/carousel/video-metadata-overlay';
import { useCarouselLayout } from '@/features/files/hooks/use-carousel-layout';
import { useCarouselMediaState } from '@/features/files/hooks/use-carousel-media-state';
import { useCarouselPreloading } from '@/features/files/hooks/use-carousel-preloading';
import { useCarouselVideoControls } from '@/features/files/hooks/use-carousel-video-controls';
import * as carouselHelpers from '@/features/files/lib/carousel';
import { FileItem } from '@/features/files/types/file';
import type { VideoPlayerHandle } from '@/features/files/types/video-player';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { useDelayedTrue } from '@/hooks/use-delayed-true';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { clampIndex } from '@/lib/clamp';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import * as React from 'react';
import { Platform, View } from 'react-native';
import { CaretLeft, CaretRight } from 'phosphor-react-native';

import Animated, {
  Extrapolation,
  interpolate,
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
  files,
  isKeyboardNavigationEnabled = false,
  onActiveMediaChange,
  onDismissLockChange,
  onUiHiddenChange,
  renderMediaActions,
  topActionsOffset = 0,
  videoHandleRef: externalVideoHandleRef,
  videoPlaybackRate = 1,
}: {
  defaultIndex?: number;
  dismissMediaOpacity?: SharedValue<number>;
  dismissMediaTranslateY?: SharedValue<number>;
  dismissOverlayOpacity?: SharedValue<number>;
  isDismissGestureActive?: boolean;
  files: FileItem[];
  isKeyboardNavigationEnabled?: boolean;
  onActiveMediaChange?: (fileId: string) => void;
  onDismissLockChange?: (isLocked: boolean) => void;
  onUiHiddenChange?: (isHidden: boolean) => void;
  renderMediaActions?: (file: FileItem) => React.ReactNode;
  topActionsOffset?: number;
  videoHandleRef?: React.RefObject<VideoPlayerHandle | null>;
  videoPlaybackRate?: number;
}) => {
  const breakpoints = useBreakpoints();
  const insets = useSafeAreaInsets();
  const carouselRef = React.useRef<ICarouselInstance>(null);
  const localVideoHandleRef = React.useRef<VideoPlayerHandle | null>(null);
  const videoHandleRef = externalVideoHandleRef ?? localVideoHandleRef;

  const getClampedIndex = React.useCallback(
    (index: number) => clampIndex(index, files.length),
    [files.length]
  );

  const safeDefaultIndex = getClampedIndex(defaultIndex);
  const activeIndex = useSharedValue(safeDefaultIndex);
  const activeIndexRef = React.useRef(safeDefaultIndex);
  const carouselGestureStartIndexRef = React.useRef<number | null>(null);
  const dismissGestureLockIndexRef = React.useRef<number | null>(null);
  const isDismissGestureActiveRef = React.useRef(isDismissGestureActive);
  isDismissGestureActiveRef.current = isDismissGestureActive;

  const activeMediaIdRef = React.useRef<string | undefined>(
    files[safeDefaultIndex]?.id
  );

  const [isPlaying, setIsPlaying] = React.useState(
    files[safeDefaultIndex]?.type === 'video'
  );

  const [activeIndexState, setActiveIndexState] =
    React.useState(safeDefaultIndex);

  const [isSwiping, setIsSwiping] = React.useState(false);
  const [isTrackSheetOpen, setIsTrackSheetOpen] = React.useState(false);

  const [isTranscriptSheetOpen, setIsTranscriptSheetOpen] =
    React.useState(false);

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
  } = useCarouselMediaState({ activeIndexState, isSwiping, files });

  const {
    commitVideoScrub,
    handleToggleMute,
    handleTogglePlay,
    handleVideoTimeChange,
    isMuted,
    pauseVideo,
    playVideoFrom,
    previewVideoScrub,
    resetVideoUiState,
    startVideoScrub,
    videoCurrentTime,
    videoDuration,
  } = useCarouselVideoControls({
    activeIndexState,
    isPlaying,
    files,
    setIsPlaying,
    setVideoPlaybackIntent,
    videoHandleRef,
  });

  const {
    contentHeight,
    contentWidth,
    handleConfigurePanGesture,
    handleLayout,
  } = useCarouselLayout({ activeIndex: activeIndexState, carouselRef });

  const {
    handleActiveMediaLoad,
    isActiveMediaLoading,
    syncActiveMediaLoadingState,
  } = useCarouselPreloading({ activeIndexRef, getClampedIndex, files });

  const getDominantIndex = React.useCallback(
    (absoluteProgress: number) =>
      carouselHelpers.getDominantCarouselIndex(absoluteProgress, files.length),
    [files.length]
  );

  const getVisibleMediaIds = React.useCallback(
    (absoluteProgress: number) =>
      carouselHelpers.getVisibleCarouselMediaIds(files, absoluteProgress),
    [files]
  );

  const visibleMediaIdsRef = React.useRef(
    carouselHelpers.getVisibleCarouselMediaIds(files, safeDefaultIndex)
  );

  const dotsBottomOffset = 12 + insets.bottom;
  const scrubberBottomOffset = 44 + insets.bottom;
  const activeMedia = files[activeIndexState];
  const isActiveVideo = activeMedia?.type === 'video';
  const isOverlaySheetOpen = isTrackSheetOpen || isTranscriptSheetOpen;
  const canPaginate = files.length > 1;
  const isPaginationDisabled = isNavigationLocked || isDismissGestureActive;
  const showDesktopPagination = Platform.OS === 'web' && breakpoints.md;

  const showImageLoadingIndicator =
    activeMedia?.type === 'image' && isActiveMediaLoading;

  const shouldShowImageLoadingIndicator = useDelayedTrue(
    showImageLoadingIndicator,
    { resetKey: activeMedia?.id }
  );

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

  const activeMediaOverlayProgressStyle = useAnimatedStyle(() => {
    const distanceFromActiveIndex = Math.abs(
      activeIndex.value - activeIndexState
    );

    return {
      opacity: interpolate(
        distanceFromActiveIndex,
        [0, 0.45],
        [1, 0],
        Extrapolation.CLAMP
      ),
    };
  }, [activeIndexState]);

  React.useEffect(() => {
    onUiHiddenChange?.(false);

    return () => {
      onUiHiddenChange?.(false);
    };
  }, [onUiHiddenChange]);

  React.useEffect(() => {
    onDismissLockChange?.(isNavigationLocked || isOverlaySheetOpen);
  }, [isNavigationLocked, isOverlaySheetOpen, onDismissLockChange]);

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

  const openAdjacentPage = React.useCallback(
    (direction: -1 | 1) => {
      if (isPaginationDisabled) return;

      const currentIndex =
        carouselRef.current?.getCurrentIndex() ?? activeIndexState;

      setPage(currentIndex + direction);
    },
    [activeIndexState, isPaginationDisabled, setPage]
  );

  React.useEffect(() => {
    if (files.length === 0) {
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
      ? files.findIndex((item) => item.id === currentMediaId)
      : -1;

    const nextIndex =
      preservedIndex !== -1
        ? preservedIndex
        : getClampedIndex(activeIndexRef.current);

    const nextMediaId = files[nextIndex]?.id;
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
      files[nextIndex]?.type === 'video' && shouldAutoPlayVideo(nextMediaId)
    );

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ animated: false, index: nextIndex });
    });
  }, [
    activeIndex,
    getClampedIndex,
    getVisibleMediaIds,
    files,
    resetVideoUiState,
    shouldAutoPlayVideo,
    syncActiveMediaLoadingState,
  ]);

  React.useEffect(() => {
    if (files.length === 0) return;
    if (safeDefaultIndex === activeIndexRef.current) return;
    const nextMediaId = files[safeDefaultIndex]?.id;
    resetVideoUiState();
    activeIndex.value = safeDefaultIndex;
    activeIndexRef.current = safeDefaultIndex;
    activeMediaIdRef.current = nextMediaId;
    visibleMediaIdsRef.current = getVisibleMediaIds(safeDefaultIndex);
    setActiveIndexState(safeDefaultIndex);
    syncActiveMediaLoadingState(safeDefaultIndex);

    setIsPlaying(
      files[safeDefaultIndex]?.type === 'video' &&
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
    files,
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
        setPage(Math.min(files.length - 1, currentIndex + 1));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeIndexState,
    isDismissGestureActive,
    isKeyboardNavigationEnabled,
    isNavigationLocked,
    files.length,
    setPage,
  ]);

  const syncActiveIndex = React.useCallback(
    (index: number) => {
      const previousIndex = activeIndexRef.current;
      if (index === previousIndex) return;
      resetVideoUiState();
      activeIndexRef.current = index;
      activeMediaIdRef.current = files[index]?.id;
      setActiveIndexState(index);
      syncActiveMediaLoadingState(index);

      setIsPlaying(
        files[index]?.type === 'video' && shouldAutoPlayVideo(files[index]?.id)
      );
    },
    [files, resetVideoUiState, shouldAutoPlayVideo, syncActiveMediaLoadingState]
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

    visibleMediaIdsRef.current.forEach((fileId) => {
      if (!lockedVisibleMediaIds.has(fileId)) handleHiddenMedia(fileId);
    });

    visibleMediaIdsRef.current = lockedVisibleMediaIds;
    syncActiveIndex(lockedIndex);
    carouselRef.current?.scrollTo({ animated: false, index: lockedIndex });
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

      visibleMediaIdsRef.current.forEach((fileId) => {
        if (!nextVisibleMediaIds.has(fileId)) handleHiddenMedia(fileId);
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
      const nextMediaId = files[index]?.id;
      if (nextMediaId) onActiveMediaChange?.(nextMediaId);
    },
    [files, onActiveMediaChange, resetToDismissLockedIndex, syncActiveIndex]
  );

  const renderCarouselItem = React.useCallback(
    ({ index, item }: { index: number; item: FileItem }) => {
      const shouldAutoPlay = videoPlaybackIntentState[item.id] ?? true;

      return (
        <Item
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          index={index}
          isActiveMediaLoading={isActiveMediaLoading}
          isMuted={isMuted}
          item={item}
          mediaQuality={carouselHelpers.CAROUSEL_FILE_QUALITY}
          onActiveMediaLoad={handleActiveMediaLoad}
          onTogglePlay={handleTogglePlay}
          onVideoTimeChange={handleVideoTimeChange}
          onZoomInteractionStateChange={handleZoomInteractionStateChange}
          onZoomStateChange={handleZoomStateChange}
          playbackRate={videoPlaybackRate}
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
      setIsPlaying,
      videoPlaybackRate,
      videoPlaybackIntentState,
      videoResetTokens,
      videoHandleRef,
      zoomResetTokens,
    ]
  );

  return (
    <View className="relative flex-1" onLayout={handleLayout}>
      <Animated.View className="flex-1" style={mediaLayerStyle}>
        {contentWidth > 0 && contentHeight > 0 && (
          <ReanimatedCarousel
            ref={carouselRef}
            data={files}
            defaultIndex={safeDefaultIndex}
            height={contentHeight}
            loop={false}
            onConfigurePanGesture={handleConfigurePanGesture}
            onProgressChange={handleProgressChange}
            onScrollEnd={handleCarouselScrollEnd}
            onScrollStart={handleCarouselScrollStart}
            renderItem={renderCarouselItem}
            style={carouselStyle}
            width={contentWidth}
            windowSize={carouselHelpers.CAROUSEL_PRELOAD_DISTANCE * 2 + 1}
            enabled={
              !isNavigationLocked && !isDismissGestureActive && files.length > 1
            }
          />
        )}
        {shouldShowImageLoadingIndicator && (
          <View className="absolute inset-0 pointer-events-none items-center justify-center">
            <Spinner />
          </View>
        )}
      </Animated.View>
      <Animated.View
        className="absolute inset-0"
        style={[overlayOpacityStyle, { pointerEvents: 'box-none' }]}
      >
        <Animated.View
          className="absolute inset-0"
          style={[
            activeMediaOverlayProgressStyle,
            { pointerEvents: 'box-none' },
          ]}
        >
          {!!activeMedia && renderMediaActions && (
            <View
              className="absolute right-4 z-10 flex-row pointer-events-auto items-center md:right-8"
              style={{ top: topActionsOffset }}
            >
              {canPaginate && showDesktopPagination && (
                <React.Fragment>
                  <Button
                    accessibilityLabel="Previous media"
                    className="size-11"
                    disabled={isPaginationDisabled || activeIndexState <= 0}
                    onPress={() => openAdjacentPage(-1)}
                    size="icon"
                    variant="link"
                    wrapperClassName="rounded-full"
                  >
                    <Icon
                      className="text-popover-foreground"
                      icon={CaretLeft}
                      size={24}
                    />
                  </Button>
                  <Button
                    accessibilityLabel="Next media"
                    className="size-11"
                    onPress={() => openAdjacentPage(1)}
                    size="icon"
                    variant="link"
                    wrapperClassName="rounded-full"
                    disabled={
                      isPaginationDisabled ||
                      activeIndexState >= files.length - 1
                    }
                  >
                    <Icon
                      className="text-popover-foreground"
                      icon={CaretRight}
                      size={24}
                    />
                  </Button>
                </React.Fragment>
              )}
              {renderMediaActions(activeMedia)}
            </View>
          )}
          {isActiveVideo && (
            <React.Fragment>
              <VideoMetadataOverlay
                currentTime={videoCurrentTime}
                file={activeMedia}
                isHidden={isActiveMediaLoading}
                onTrackOpenChange={setIsTrackSheetOpen}
                onTranscriptOpenChange={setIsTranscriptSheetOpen}
                scrubberBottomOffset={scrubberBottomOffset}
                trackControls={{
                  currentTime: videoCurrentTime,
                  isPlaying,
                  pause: pauseVideo,
                  playFrom: playVideoFrom,
                }}
                transcriptControls={{
                  currentTime: videoCurrentTime,
                  isPlaying,
                  pause: pauseVideo,
                  playFrom: playVideoFrom,
                }}
              />
              <VideoControls
                currentTime={videoCurrentTime}
                duration={videoDuration}
                isMuted={isMuted}
                isPlaying={isPlaying}
                isSwiping={isSwiping}
                onScrubEnd={commitVideoScrub}
                onScrubMove={previewVideoScrub}
                onScrubStart={startVideoScrub}
                onToggleMute={handleToggleMute}
                onTogglePlay={handleTogglePlay}
                scrubberBottomOffset={scrubberBottomOffset}
              />
            </React.Fragment>
          )}
        </Animated.View>
      </Animated.View>
      <Animated.View
        className="absolute left-4 right-4 z-10 pointer-events-none items-center md:left-8 md:right-8"
        style={[overlayOpacityStyle, { bottom: dotsBottomOffset }]}
      >
        {files.length > 1 && (
          <Dots activeIndex={activeIndex} count={files.length} />
        )}
      </Animated.View>
    </View>
  );
};
