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

export const CarouselItem = ({
  contentHeight,
  contentWidth,
  index,
  isMuted,
  isPlaying,
  isScrubbingVideo,
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
          item={item}
          mediaQuality={mediaQuality}
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
          item={item}
          mediaQuality={mediaQuality}
          onZoomInteractionStateChange={onZoomInteractionStateChange}
          onZoomStateChange={onZoomStateChange}
          resetZoomToken={resetZoomToken}
        />
      )}
    </View>
  );
};

const CarouselVideoItem = ({
  contentHeight,
  contentWidth,
  isActive,
  isAdjacent,
  isMuted,
  isPlaying,
  isScrubbingVideo,
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
}: {
  contentHeight: number;
  contentWidth: number;
  isActive: boolean;
  isAdjacent: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  isScrubbingVideo: boolean;
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
}) => {
  const previewUri = item.thumbnailUri ?? null;

  return (
    <View className="bg-background relative w-full flex-1 items-center justify-center">
      {!!previewUri && (
        <Image
          contentFit="contain"
          fill
          quality={mediaQuality}
          uri={previewUri}
          wrapperClassName="bg-background"
        />
      )}
      {isAdjacent ? (
        <ZoomableMedia
          disabledDoubleTapZoom
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
            className="flex-1 items-center justify-center self-stretch"
            onPress={isActive ? onTogglePlay : undefined}
          >
            <video.VideoPlayer
              autoPlay={isActive && shouldAutoPlay}
              handleRef={isActive ? videoHandleRef : undefined}
              maxHeight={contentHeight}
              maxWidth={contentWidth}
              muted={isMuted}
              onPlayingChange={isActive ? setIsPlaying : undefined}
              onTimeChange={isActive ? onVideoTimeChange : undefined}
              resetToken={resetVideoToken}
              thumbnailQuality={mediaQuality}
              thumbnailUri={item.thumbnailUri}
              uri={item.uri}
            />
            {isActive && !isPlaying && !isScrubbingVideo && (
              <VideoPlayOverlay />
            )}
          </Pressable>
        </ZoomableMedia>
      ) : null}
    </View>
  );
};

const CarouselImageItem = ({
  contentHeight,
  contentWidth,
  item,
  mediaQuality,
  onZoomInteractionStateChange,
  onZoomStateChange,
  resetZoomToken,
}: {
  contentHeight: number;
  contentWidth: number;
  item: Media;
  mediaQuality: number;
  onZoomInteractionStateChange: (
    mediaId: string,
    nextIsInteracting: boolean
  ) => void;
  onZoomStateChange: (mediaId: string, nextIsZoomed: boolean) => void;
  resetZoomToken: number;
}) => {
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
