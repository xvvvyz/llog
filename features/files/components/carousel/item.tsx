import { LocalVideoPreview } from '@/features/files/components/local-video-preview';
import { UploadProgressOverlay } from '@/features/files/components/upload-progress-overlay';
import { VideoPlayer } from '@/features/files/components/video-player';
import { ZoomableMedia } from '@/features/files/components/zoomable';
import * as carouselHelpers from '@/features/files/lib/carousel';
import { getFileSourceUri } from '@/features/files/lib/file-uri-to-src';
import { useCachedFileSource } from '@/features/files/lib/offline-availability';
import * as visualMedia from '@/features/files/lib/visual-media';
import { useQueuedAttachmentStatus } from '@/features/offline/outbox-hooks';
import { FileItem } from '@/features/files/types/file';
import type { VideoPlayerHandle } from '@/features/files/types/video-player';
import { Image } from '@/ui/image';
import * as React from 'react';
import { PixelRatio, Pressable, View } from 'react-native';

type ItemProps = {
  contentHeight: number;
  contentWidth: number;
  index: number;
  isActiveMediaLoading: boolean;
  isMuted: boolean;
  onActiveMediaLoad: (fileId: string, index: number) => void;
  item: FileItem;
  mediaQuality: number;
  onTogglePlay: () => void;
  onVideoTimeChange: (currentTime: number, duration: number) => void;
  onZoomInteractionStateChange: (
    fileId: string,
    nextIsInteracting: boolean
  ) => void;
  onZoomStateChange: (fileId: string, nextIsZoomed: boolean) => void;
  playbackRate: number;
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
  onActiveMediaLoad,
  item,
  mediaQuality,
  onTogglePlay,
  onVideoTimeChange,
  onZoomInteractionStateChange,
  onZoomStateChange,
  playbackRate,
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
          item={item}
          mediaQuality={mediaQuality}
          onActiveMediaLoad={onActiveMediaLoad}
          onTogglePlay={onTogglePlay}
          onVideoTimeChange={onVideoTimeChange}
          onZoomInteractionStateChange={onZoomInteractionStateChange}
          onZoomStateChange={onZoomStateChange}
          playbackRate={playbackRate}
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
  index,
  item,
  mediaQuality,
  onActiveMediaLoad,
  onTogglePlay,
  onVideoTimeChange,
  onZoomInteractionStateChange,
  onZoomStateChange,
  playbackRate,
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
  index: number;
  item: FileItem;
  mediaQuality: number;
  onActiveMediaLoad: (fileId: string, index: number) => void;
  onTogglePlay: () => void;
  onVideoTimeChange: (currentTime: number, duration: number) => void;
  onZoomInteractionStateChange: (
    fileId: string,
    nextIsInteracting: boolean
  ) => void;
  onZoomStateChange: (fileId: string, nextIsZoomed: boolean) => void;
  playbackRate: number;
  resetVideoToken: number;
  resetZoomToken: number;
  setIsPlaying: (isPlaying: boolean) => void;
  shouldAutoPlay: boolean;
  videoHandleRef: React.RefObject<VideoPlayerHandle | null>;
}) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const hasReportedActiveLoadRef = React.useRef(false);
  const sourceUri = getFileSourceUri(item);
  const queuedStatus = useQueuedAttachmentStatus(item.id);
  const isProcessing = visualMedia.isProcessing(item);

  // A still-uploading/encoding video can't stream through HLS yet; show its
  // local source as a plain video instead so the slide isn't blank.
  const isPendingUpload =
    isProcessing || (queuedStatus != null && queuedStatus !== 'error');

  const cachedSource = useCachedFileSource({
    enabled: true,
    type: 'media',
    uri: sourceUri,
  });

  const shouldRenderVideo =
    isActive || (isAdjacent && (shouldRenderInactiveMedia || hasLoaded));

  const canTogglePlay = isActive;

  React.useEffect(() => {
    if (!isPendingUpload || !isActive || hasReportedActiveLoadRef.current) {
      return;
    }

    hasReportedActiveLoadRef.current = true;
    onActiveMediaLoad(item.id, index);
  }, [index, isActive, isPendingUpload, item.id, onActiveMediaLoad]);

  React.useEffect(() => {
    setHasLoaded(false);
    hasReportedActiveLoadRef.current = false;
  }, [cachedSource.src, item.id, item.thumbnailUri, sourceUri]);

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

  if (isPendingUpload) {
    return (
      <View className="relative flex-1 w-full items-center justify-center">
        {visualMedia.isLocalPreviewableUri(item.uri) && (
          <LocalVideoPreview
            autoPlay={isActive}
            contentFit="contain"
            maxHeight={contentHeight}
            maxWidth={contentWidth}
            uri={item.uri}
          />
        )}
        <UploadProgressOverlay
          barLayout="spinner"
          fileId={item.id}
          isProcessing
          isVideo
        />
      </View>
    );
  }

  return (
    <View className="relative flex-1 w-full items-center justify-center">
      {shouldRenderVideo && (
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
              disabled={!canTogglePlay}
              onPress={canTogglePlay ? onTogglePlay : undefined}
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
                playbackRate={playbackRate}
                resetToken={resetVideoToken}
                thumbnailQuality={mediaQuality}
                thumbnailUri={item.thumbnailUri}
                uri={cachedSource.src ?? sourceUri}
              />
            </Pressable>
          </ZoomableMedia>
        </React.Fragment>
      )}
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
  item: FileItem;
  mediaQuality: number;
  onActiveMediaLoad: (fileId: string, index: number) => void;
  onZoomInteractionStateChange: (
    fileId: string,
    nextIsInteracting: boolean
  ) => void;
  onZoomStateChange: (fileId: string, nextIsZoomed: boolean) => void;
  resetZoomToken: number;
  shouldRenderInactiveMedia: boolean;
}) => {
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [hasDisplayed, setHasDisplayed] = React.useState(false);
  const hasReportedActiveLoadRef = React.useRef(false);
  const sourceUri = getFileSourceUri(item);

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

  const cachedImage = useCachedFileSource({
    enabled: true,
    options: { quality: mediaQuality, targetHeight, targetWidth },
    type: 'image',
    uri: sourceUri,
  });

  const shouldRenderImage =
    isActive || (isAdjacent && shouldRenderInactiveMedia) || hasLoaded;

  React.useEffect(() => {
    setHasLoaded(false);
    setHasDisplayed(false);
    hasReportedActiveLoadRef.current = false;
  }, [cachedImage.src, item.id, sourceUri]);

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
        src={cachedImage.src}
        targetHeight={targetHeight}
        targetWidth={targetWidth}
        uri={sourceUri}
        width={contentWidth}
        wrapperClassName="bg-transparent"
      />
    </ZoomableMedia>
  );
};
