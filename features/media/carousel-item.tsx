import * as video from '@/features/media/video-player';
import { ZoomableMedia } from '@/features/media/zoomable-media';
import { Media } from '@/types/media';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import * as React from 'react';
import { Pressable, View } from 'react-native';

type CarouselItemProps = {
  contentHeight: number;
  contentWidth: number;
  index: number;
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
  videoHandleRef: React.RefObject<video.VideoPlayerHandle | null>;
  visibleIndex: number;
};

const CarouselItemComponent = ({
  contentHeight,
  contentWidth,
  index,
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
}: CarouselItemProps) => {
  const isActive = index === visibleIndex;
  const isAdjacent = Math.abs(index - visibleIndex) <= 2;

  return (
    <View
      className="items-center justify-center"
      style={{ width: contentWidth, height: contentHeight }}
    >
      {item.type === 'video' ? (
        <CarouselVideoItem
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          isActive={isActive}
          isAdjacent={isAdjacent}
          isMuted={isMuted}
          isPlaying={isPlaying}
          isScrubbingVideo={isScrubbingVideo}
          index={index}
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
          videoHandleRef={videoHandleRef}
        />
      ) : (
        <CarouselImageItem
          contentHeight={contentHeight}
          contentWidth={contentWidth}
          index={index}
          isActive={isActive}
          item={item}
          mediaQuality={mediaQuality}
          onActiveMediaLoad={onActiveMediaLoad}
          onZoomInteractionStateChange={onZoomInteractionStateChange}
          onZoomStateChange={onZoomStateChange}
          resetZoomToken={resetZoomToken}
        />
      )}
    </View>
  );
};

export const CarouselItem = React.memo(CarouselItemComponent);

CarouselItem.displayName = 'CarouselItem';

const CarouselVideoItem = ({
  contentHeight,
  contentWidth,
  isActive,
  isAdjacent,
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
  videoHandleRef: React.RefObject<video.VideoPlayerHandle | null>;
}) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const hasReportedActiveLoadRef = React.useRef(false);

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
    <View className="bg-background relative w-full flex-1 items-center justify-center">
      {isAdjacent ? (
        <React.Fragment>
          <ZoomableMedia
            suppressDoubleTapZoom
            height={contentHeight}
            onInteractionStateChange={(nextIsInteracting) =>
              onZoomInteractionStateChange(item.id, nextIsInteracting)
            }
            onZoomStateChange={(nextIsZoomed) =>
              onZoomStateChange(item.id, nextIsZoomed)
            }
            resetToken={resetZoomToken}
            width={contentWidth}
          >
            <Pressable
              className="items-center justify-center"
              onPress={isActive ? onTogglePlay : undefined}
              style={{ width: contentWidth, height: contentHeight }}
            >
              <video.VideoPlayer
                autoPlay={isActive && shouldAutoPlay}
                handleRef={isActive ? videoHandleRef : undefined}
                maxHeight={contentHeight}
                maxWidth={contentWidth}
                muted={isMuted}
                onReady={handleLoaded}
                onPlayingChange={isActive ? setIsPlaying : undefined}
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
  item,
  mediaQuality,
  onActiveMediaLoad,
  onZoomInteractionStateChange,
  onZoomStateChange,
  resetZoomToken,
}: {
  contentHeight: number;
  contentWidth: number;
  index: number;
  isActive: boolean;
  item: Media;
  mediaQuality: number;
  onActiveMediaLoad: (mediaId: string, index: number) => void;
  onZoomInteractionStateChange: (
    mediaId: string,
    nextIsInteracting: boolean
  ) => void;
  onZoomStateChange: (mediaId: string, nextIsZoomed: boolean) => void;
  resetZoomToken: number;
}) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const hasReportedActiveLoadRef = React.useRef(false);

  React.useEffect(() => {
    setHasLoaded(false);
    hasReportedActiveLoadRef.current = false;
  }, [item.id, item.uri]);

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
    <ZoomableMedia
      height={contentHeight}
      onInteractionStateChange={(nextIsInteracting) =>
        onZoomInteractionStateChange(item.id, nextIsInteracting)
      }
      onZoomStateChange={(nextIsZoomed) =>
        onZoomStateChange(item.id, nextIsZoomed)
      }
      resetToken={resetZoomToken}
      width={contentWidth}
    >
      <Image
        contentFit="contain"
        height={contentHeight}
        onDisplay={handleLoaded}
        onLoad={handleLoaded}
        quality={mediaQuality}
        uri={item.uri}
        width={contentWidth}
        wrapperClassName="bg-background"
      />
    </ZoomableMedia>
  );
};

const VideoPlayOverlay = () => {
  return (
    <View className="pointer-events-none absolute inset-0 items-center justify-center">
      <View className="bg-contrast-background/50 size-16 items-center justify-center rounded-full">
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
