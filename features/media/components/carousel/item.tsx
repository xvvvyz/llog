import { VideoPlayer } from '@/features/media/components/video-player';
import { ZoomableMedia } from '@/features/media/components/zoomable';
import * as carouselHelpers from '@/features/media/lib/carousel';
import { Media } from '@/features/media/types/media';
import type { VideoPlayerHandle } from '@/features/media/types/video-player';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Play } from 'phosphor-react-native';
import * as React from 'react';
import { PixelRatio, Pressable, View } from 'react-native';

type ItemProps = {
  contentHeight: number;
  contentWidth: number;
  index: number;
  isActiveMediaLoading: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  isScrubbingVideo: boolean;
  onActiveMediaLoad: (mediaId: string, index: number) => void;
  item: Media;
  mediaQuality: number;
  onTogglePlay: () => void;
  onVideoTimeChange: (currentTime: number, duration: number) => void;
  onZoomInteractionStateChange: (
    mediaId: string,
    nextIsInteracting: boolean
  ) => void;
  onZoomStateChange: (mediaId: string, nextIsZoomed: boolean) => void;
  resetVideoToken: number;
  resetZoomToken: number;
  setIsPlaying: (isPlaying: boolean) => void;
  shouldAutoPlay: boolean;
  videoHandleRef: React.RefObject<VideoPlayerHandle | null>;
  visibleIndex: number;
};

const ItemComponent = ({
  contentHeight,
  contentWidth,
  index,
  isActiveMediaLoading,
  isMuted,
  isPlaying,
  isScrubbingVideo,
  onActiveMediaLoad,
  item,
  mediaQuality,
  onTogglePlay,
  onVideoTimeChange,
  onZoomInteractionStateChange,
  onZoomStateChange,
  resetVideoToken,
  resetZoomToken,
  setIsPlaying,
  shouldAutoPlay,
  videoHandleRef,
  visibleIndex,
}: ItemProps) => {
  const isActive = index === visibleIndex;

  const isAdjacent =
    Math.abs(index - visibleIndex) <= carouselHelpers.CAROUSEL_PRELOAD_DISTANCE;

  const shouldRenderInactiveMedia = !isActiveMediaLoading;

  return (
    <View
      className="items-center justify-center"
      style={{ width: contentWidth, height: contentHeight }}
    >
      {item.type === 'video' ? (
        <CarouselVideoItem
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          index={index}
          isActive={isActive}
          isAdjacent={isAdjacent}
          isMuted={isMuted}
          isPlaying={isPlaying}
          isScrubbingVideo={isScrubbingVideo}
          item={item}
          mediaQuality={mediaQuality}
          onActiveMediaLoad={onActiveMediaLoad}
          onTogglePlay={onTogglePlay}
          onVideoTimeChange={onVideoTimeChange}
          onZoomInteractionStateChange={onZoomInteractionStateChange}
          onZoomStateChange={onZoomStateChange}
          resetVideoToken={resetVideoToken}
          resetZoomToken={resetZoomToken}
          setIsPlaying={setIsPlaying}
          shouldAutoPlay={shouldAutoPlay}
          shouldRenderInactiveMedia={shouldRenderInactiveMedia}
          videoHandleRef={videoHandleRef}
        />
      ) : (
        <CarouselImageItem
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          index={index}
          isActive={isActive}
          isAdjacent={isAdjacent}
          item={item}
          mediaQuality={mediaQuality}
          onActiveMediaLoad={onActiveMediaLoad}
          onZoomInteractionStateChange={onZoomInteractionStateChange}
          onZoomStateChange={onZoomStateChange}
          resetZoomToken={resetZoomToken}
          shouldRenderInactiveMedia={shouldRenderInactiveMedia}
        />
      )}
    </View>
  );
};

export const Item = React.memo(ItemComponent);
Item.displayName = 'Item';

const CarouselVideoItem = ({
  contentHeight,
  contentWidth,
  isActive,
  isAdjacent,
  shouldRenderInactiveMedia,
  isMuted,
  isPlaying,
  isScrubbingVideo,
  index,
  item,
  mediaQuality,
  onActiveMediaLoad,
  onTogglePlay,
  onVideoTimeChange,
  onZoomInteractionStateChange,
  onZoomStateChange,
  resetVideoToken,
  resetZoomToken,
  setIsPlaying,
  shouldAutoPlay,
  videoHandleRef,
}: {
  contentHeight: number;
  contentWidth: number;
  isActive: boolean;
  isAdjacent: boolean;
  shouldRenderInactiveMedia: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  isScrubbingVideo: boolean;
  index: number;
  item: Media;
  mediaQuality: number;
  onActiveMediaLoad: (mediaId: string, index: number) => void;
  onTogglePlay: () => void;
  onVideoTimeChange: (currentTime: number, duration: number) => void;
  onZoomInteractionStateChange: (
    mediaId: string,
    nextIsInteracting: boolean
  ) => void;
  onZoomStateChange: (mediaId: string, nextIsZoomed: boolean) => void;
  resetVideoToken: number;
  resetZoomToken: number;
  setIsPlaying: (isPlaying: boolean) => void;
  shouldAutoPlay: boolean;
  videoHandleRef: React.RefObject<VideoPlayerHandle | null>;
}) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const hasReportedActiveLoadRef = React.useRef(false);

  const shouldRenderVideo =
    isActive || (isAdjacent && (shouldRenderInactiveMedia || hasLoaded));

  React.useEffect(() => {
    setHasLoaded(false);
    hasReportedActiveLoadRef.current = false;
  }, [item.id, item.thumbnailUri, item.uri]);

  React.useEffect(() => {
    if (!isActive) hasReportedActiveLoadRef.current = false;
  }, [isActive]);

  React.useEffect(() => {
    if (!isActive || !hasLoaded || hasReportedActiveLoadRef.current) return;
    hasReportedActiveLoadRef.current = true;
    onActiveMediaLoad(item.id, index);
  }, [hasLoaded, index, isActive, item.id, onActiveMediaLoad]);

  const handleLoaded = React.useCallback(() => {
    setHasLoaded(true);
  }, []);

  return (
    <View className="relative flex-1 w-full items-center justify-center">
      {shouldRenderVideo ? (
        <React.Fragment>
          <ZoomableMedia
            height={contentHeight}
            resetToken={resetZoomToken}
            suppressDoubleTapZoom
            width={contentWidth}
            onInteractionStateChange={(nextIsInteracting) =>
              onZoomInteractionStateChange(item.id, nextIsInteracting)
            }
            onZoomStateChange={(nextIsZoomed) =>
              onZoomStateChange(item.id, nextIsZoomed)
            }
          >
            <Pressable
              className="items-center justify-center"
              onPress={isActive ? onTogglePlay : undefined}
              style={{ width: contentWidth, height: contentHeight }}
            >
              <VideoPlayer
                autoPlay={isActive && shouldAutoPlay}
                handleRef={isActive ? videoHandleRef : undefined}
                maxHeight={contentHeight}
                maxWidth={contentWidth}
                muted={isMuted}
                onPlayingChange={isActive ? setIsPlaying : undefined}
                onReady={handleLoaded}
                onTimeChange={isActive ? onVideoTimeChange : undefined}
                resetToken={resetVideoToken}
                thumbnailQuality={mediaQuality}
                thumbnailUri={item.thumbnailUri}
                uri={item.uri}
              />
            </Pressable>
          </ZoomableMedia>
          {isActive && !isPlaying && !isScrubbingVideo && <VideoPlayOverlay />}
        </React.Fragment>
      ) : null}
    </View>
  );
};

const CarouselImageItem = ({
  contentHeight,
  contentWidth,
  index,
  isActive,
  isAdjacent,
  item,
  mediaQuality,
  onActiveMediaLoad,
  onZoomInteractionStateChange,
  onZoomStateChange,
  resetZoomToken,
  shouldRenderInactiveMedia,
}: {
  contentHeight: number;
  contentWidth: number;
  index: number;
  isActive: boolean;
  isAdjacent: boolean;
  item: Media;
  mediaQuality: number;
  onActiveMediaLoad: (mediaId: string, index: number) => void;
  onZoomInteractionStateChange: (
    mediaId: string,
    nextIsInteracting: boolean
  ) => void;
  onZoomStateChange: (mediaId: string, nextIsZoomed: boolean) => void;
  resetZoomToken: number;
  shouldRenderInactiveMedia: boolean;
}) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [hasDisplayed, setHasDisplayed] = React.useState(false);
  const hasReportedActiveLoadRef = React.useRef(false);

  const requestScale =
    Math.min(PixelRatio.get(), 2) *
    carouselHelpers.CAROUSEL_IMAGE_REQUEST_SCALE;

  const targetWidth = Math.min(
    Math.round(contentWidth * requestScale),
    carouselHelpers.CAROUSEL_IMAGE_MAX_TARGET_SIZE
  );

  const targetHeight = Math.min(
    Math.round(contentHeight * requestScale),
    carouselHelpers.CAROUSEL_IMAGE_MAX_TARGET_SIZE
  );

  const shouldRenderImage =
    isActive || (isAdjacent && shouldRenderInactiveMedia) || hasLoaded;

  React.useEffect(() => {
    setHasLoaded(false);
    setHasDisplayed(false);
    hasReportedActiveLoadRef.current = false;
  }, [item.id, item.uri]);

  React.useEffect(() => {
    if (!isActive) hasReportedActiveLoadRef.current = false;
  }, [isActive]);

  React.useEffect(() => {
    if (!isActive || !hasDisplayed || hasReportedActiveLoadRef.current) return;
    hasReportedActiveLoadRef.current = true;
    onActiveMediaLoad(item.id, index);
  }, [hasDisplayed, index, isActive, item.id, onActiveMediaLoad]);

  const handleLoad = React.useCallback(() => {
    setHasLoaded(true);
  }, []);

  const handleDisplay = React.useCallback(() => {
    setHasLoaded(true);
    setHasDisplayed(true);
  }, []);

  if (!shouldRenderImage) {
    return <View style={{ width: contentWidth, height: contentHeight }} />;
  }

  return (
    <ZoomableMedia
      height={contentHeight}
      resetToken={resetZoomToken}
      width={contentWidth}
      onInteractionStateChange={(nextIsInteracting) =>
        onZoomInteractionStateChange(item.id, nextIsInteracting)
      }
      onZoomStateChange={(nextIsZoomed) =>
        onZoomStateChange(item.id, nextIsZoomed)
      }
    >
      <Image
        contentFit="contain"
        height={contentHeight}
        onDisplay={handleDisplay}
        onLoad={handleLoad}
        quality={mediaQuality}
        targetHeight={targetHeight}
        targetWidth={targetWidth}
        uri={item.uri}
        width={contentWidth}
        wrapperClassName="bg-transparent"
      />
    </ZoomableMedia>
  );
};

const VideoPlayOverlay = () => {
  return (
    <View className="absolute inset-0 pointer-events-none items-center justify-center">
      <View className="size-16 rounded-full bg-contrast-background/50 items-center justify-center">
        <Icon
          className="text-contrast-foreground"
          icon={Play}
          size={28}
          weight="fill"
        />
      </View>
    </View>
  );
};
