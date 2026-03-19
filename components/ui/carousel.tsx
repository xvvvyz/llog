import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import {
  VideoPlayer,
  type VideoPlayerHandle,
} from '@/components/ui/video-player';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { Media } from '@/types/media';
import { cn } from '@/utilities/cn';
import {
  CornersOut,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
} from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gallery, type GalleryRefType } from 'react-native-zoom-toolkit';

const CHROME_PADDING = 55;

export const Carousel = ({
  className,
  defaultIndex = 0,
  media,
  isKeyboardNavigationEnabled = false,
  onClose,
}: {
  className?: string;
  defaultIndex?: number;
  media: Media[];
  isKeyboardNavigationEnabled?: boolean;
  onClose?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<GalleryRefType>(null);
  const windowDimensions = useWindowDimensions();
  const activeIndex = useSharedValue(defaultIndex);
  const enterFullscreenRef = useRef<(() => void) | null>(null);
  const videoHandleRef = useRef<VideoPlayerHandle>(null);

  const [isActiveVideo, setIsActiveVideo] = useState(
    media[defaultIndex]?.type === 'video'
  );

  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeIndexState, setActiveIndexState] = useState(defaultIndex);

  const contentHeight =
    windowDimensions.height - insets.top - insets.bottom - CHROME_PADDING * 2;

  const contentWidth = windowDimensions.width;

  useEffect(() => {
    if (!isKeyboardNavigationEnabled || Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        ref.current?.setIndex(Math.max(0, activeIndex.value - 1));
      } else if (event.key === 'ArrowRight') {
        ref.current?.setIndex(
          Math.min(media.length - 1, activeIndex.value + 1)
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isKeyboardNavigationEnabled, media.length, activeIndex]);

  const handleFullscreenReady = useCallback((fn: () => void) => {
    enterFullscreenRef.current = fn;
  }, []);

  const handleFullscreen = useCallback(() => {
    enterFullscreenRef.current?.();
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = videoHandleRef.current?.toggleMute();
    if (muted != null) setIsMuted(muted);
  }, []);

  const handleTogglePlay = useCallback(() => {
    const playing = videoHandleRef.current?.togglePlay();
    if (playing != null) setIsPlaying(playing);
  }, []);

  const renderItem = useCallback(
    (item: Media, index: number) => (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {item.type === 'video' ? (
          index === activeIndexState ? (
            <VideoPlayer
              autoPlay
              handleRef={videoHandleRef}
              maxHeight={contentHeight}
              maxWidth={contentWidth}
              onFullscreenReady={handleFullscreenReady}
              uri={item.uri}
            />
          ) : null
        ) : (
          <Image
            maxHeight={contentHeight}
            maxWidth={contentWidth}
            uri={item.uri}
          />
        )}
      </View>
    ),
    [activeIndexState, contentHeight, contentWidth, handleFullscreenReady]
  );

  return (
    <View className={cn('relative flex-1', className)}>
      <Gallery
        data={media}
        initialIndex={defaultIndex}
        keyExtractor={(item) => item.id}
        maxScale={3}
        onIndexChange={(index) => {
          activeIndex.value = index;
          setActiveIndexState(index);
          const item = media[index];
          const isVideo = item?.type === 'video';
          setIsActiveVideo(isVideo);

          if (isVideo) {
            setIsMuted(true);
            setIsPlaying(true);
          } else {
            enterFullscreenRef.current = null;
          }
        }}
        onSwipe={(direction) => {
          if ((direction === 'up' || direction === 'down') && onClose) {
            onClose();
          }
        }}
        ref={ref}
        renderItem={renderItem}
        zoomEnabled={media.length > 0}
      />
      {isActiveVideo && (
        <View
          className="absolute right-4 top-1 z-10 flex-row gap-4 md:right-4 md:top-3"
          style={{ marginTop: insets.top + 1 }}
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
          <Button
            className="size-11"
            onPress={handleTogglePlay}
            size="icon"
            variant="link"
          >
            <Icon
              className="color-foreground"
              icon={isPlaying ? Pause : Play}
              size={Platform.select({ default: 24, ios: 22 })}
            />
          </Button>
          <Button
            className="size-11"
            onPress={handleFullscreen}
            size="icon"
            variant="link"
          >
            <Icon
              className="color-foreground"
              icon={CornersOut}
              size={Platform.select({ default: 24, ios: 22 })}
            />
          </Button>
        </View>
      )}
      {media.length > 1 && (
        <PaginationDots
          activeIndex={activeIndex}
          count={media.length}
          marginBottom={insets.bottom}
          onDotPress={(index) => ref.current?.setIndex(index)}
        />
      )}
    </View>
  );
};

const PaginationDots = ({
  activeIndex,
  count,
  marginBottom,
  onDotPress,
}: {
  activeIndex: SharedValue<number>;
  count: number;
  marginBottom: number;
  onDotPress: (index: number) => void;
}) => {
  return (
    <View
      className="absolute bottom-8 left-0 right-0 flex-row items-center justify-center gap-2"
      style={{ marginBottom }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot
          activeIndex={activeIndex}
          index={i}
          key={i}
          onPress={() => onDotPress(i)}
        />
      ))}
    </View>
  );
};

const Dot = ({
  activeIndex,
  index,
  onPress,
}: {
  activeIndex: SharedValue<number>;
  index: number;
  onPress: () => void;
}) => {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(activeIndex.value === index ? 1 : 0.5, {
      duration: 200,
    }),
  }));

  return (
    <Pressable hitSlop={8} onPress={onPress}>
      <Animated.View
        className="h-2 w-2 rounded-full bg-foreground shadow-xl"
        style={style}
      />
    </Pressable>
  );
};
