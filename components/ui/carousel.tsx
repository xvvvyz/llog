import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import {
  VideoPlayer,
  type VideoPlayerHandle,
} from '@/components/ui/video-player';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useUi } from '@/queries/use-ui';
import { Media } from '@/types/media';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { preloadMedia } from '@/utilities/file-uri-to-src';
import {
  CornersOut,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
} from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gallery, type GalleryRefType } from 'react-native-zoom-toolkit';

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

  const { id: uiId, videoMuted } = useUi();
  const [isMuted, setIsMuted] = useState(videoMuted);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeIndexState, setActiveIndexState] = useState(defaultIndex);

  const contentHeight = windowDimensions.height - insets.top - insets.bottom;
  const contentWidth = windowDimensions.width;

  const preloadFromIndex = useCallback(
    (index: number) => {
      const current = media[index];

      if (current && current.type !== 'video') {
        preloadMedia(current.uri).then(() => {
          const adjacent = [index - 1, index + 1, index - 2, index + 2];

          const uris = adjacent
            .filter((i) => media[i] && media[i].type !== 'video')
            .map((i) => media[i]!.uri);

          uris.forEach((u) => preloadMedia(u));
        });
      } else {
        const adjacent = [index - 1, index + 1, index - 2, index + 2];

        const uris = adjacent
          .filter((i) => media[i] && media[i].type !== 'video')
          .map((i) => media[i]!.uri);

        uris.forEach((u) => preloadMedia(u));
      }
    },
    [media]
  );

  useEffect(() => {
    preloadFromIndex(defaultIndex);
  }, [defaultIndex, preloadFromIndex]);

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

    if (muted != null) {
      setIsMuted(muted);
      if (uiId) db.transact(db.tx.ui[uiId].update({ videoMuted: muted }));
    }
  }, [uiId]);

  const handleTogglePlay = useCallback(() => {
    const playing = videoHandleRef.current?.togglePlay();
    if (playing != null) setIsPlaying(playing);
  }, []);

  const renderItem = useCallback(
    (item: Media, index: number) => {
      const isActive = index === activeIndexState;
      const isAdjacent = Math.abs(index - activeIndexState) <= 2;

      return (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          {item.type === 'video' ? (
            isAdjacent ? (
              <VideoPlayer
                autoPlay={isActive}
                handleRef={isActive ? videoHandleRef : undefined}
                maxHeight={contentHeight}
                maxWidth={contentWidth}
                muted={isMuted}
                onFullscreenReady={isActive ? handleFullscreenReady : undefined}
                onPlayingChange={isActive ? setIsPlaying : undefined}
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
      );
    },
    [
      activeIndexState,
      contentHeight,
      contentWidth,
      handleFullscreenReady,
      isMuted,
    ]
  );

  return (
    <View className={cn('relative flex-1', className)}>
      <Gallery
        data={media}
        initialIndex={defaultIndex}
        keyExtractor={(item) => item.id}
        maxScale={3}
        onTap={() => {
          if (media[activeIndex.value]?.type === 'video') {
            handleTogglePlay();
          }
        }}
        onIndexChange={(index) => {
          if (media[activeIndex.value]?.type === 'video') {
            const handle = videoHandleRef.current;
            if (handle && isPlaying) handle.togglePlay();
          }

          activeIndex.value = index;
          setActiveIndexState(index);
          preloadFromIndex(index);
          const item = media[index];
          const isVideo = item?.type === 'video';
          setIsActiveVideo(isVideo);

          if (isVideo) {
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
        tapOnEdgeToItem={false}
        zoomEnabled={media.length > 0 && !isActiveVideo}
      />
      {isActiveVideo && (
        <View
          className="absolute right-4 top-1 z-10 md:top-3"
          style={{ marginTop: insets.top + 1 }}
        >
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
      <View
        className="absolute bottom-2 left-4 right-4 z-10 flex-row items-center justify-between md:left-8"
        style={{ marginBottom: insets.bottom }}
      >
        <View className="size-11 items-center justify-center">
          {isActiveVideo && (
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
          )}
        </View>
        {media.length > 1 && (
          <Dots
            activeIndex={activeIndex}
            count={media.length}
            onPress={(i) => ref.current?.setIndex(i)}
          />
        )}
        <View className="size-11 items-center justify-center">
          {isActiveVideo && (
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
          )}
        </View>
      </View>
    </View>
  );
};

const MAX_DOTS = 5;
const DOT_SIZE = 8;
const DOT_GAP = 8;
const DOT_STEP = DOT_SIZE + DOT_GAP;

const Dots = ({
  activeIndex,
  count,
  onPress,
}: {
  activeIndex: SharedValue<number>;
  count: number;
  onPress: (index: number) => void;
}) => {
  const visibleCount = Math.min(count, MAX_DOTS);
  const containerWidth = visibleCount * DOT_SIZE + (visibleCount - 1) * DOT_GAP;
  const startIndex = useSharedValue(0);
  const lastScrubbed = useSharedValue(-1);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startIndex.value = activeIndex.value;
          lastScrubbed.value = activeIndex.value;
        })
        .onUpdate((e) => {
          const indexDelta = Math.round(-e.translationX / DOT_STEP);

          const target = Math.max(
            0,
            Math.min(count - 1, startIndex.value + indexDelta)
          );

          if (target !== lastScrubbed.value) {
            lastScrubbed.value = target;
            runOnJS(onPress)(target);
          }
        }),
    [count, onPress]
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        style={{
          flex: 1,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: containerWidth,
            height: DOT_SIZE,
            overflow: 'hidden',
          }}
        >
          <Animated.View style={{ flexDirection: 'row', gap: DOT_GAP }}>
            {Array.from({ length: count }, (_, i) => (
              <Dot activeIndex={activeIndex} count={count} index={i} key={i} />
            ))}
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
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
    const scale = dist === 0 ? 1 : dist === 1 ? 0.75 : 0.5;
    const opacity = dist === 0 ? 1 : dist === 1 ? 0.7 : 0.4;
    const windowStart = center - half;
    const windowEnd = windowStart + MAX_DOTS - 1;

    const isVisible =
      count <= MAX_DOTS || (index >= windowStart && index <= windowEnd);

    return {
      opacity: withTiming(isVisible ? opacity : 0, { duration: 200 }),
      transform: [
        { translateX: withTiming(offset, { duration: 200 }) },
        { scale: withTiming(scale, { duration: 200 }) },
      ],
    };
  });

  return (
    <Animated.View
      className="h-2 w-2 rounded-full bg-foreground shadow-xl"
      style={style}
    />
  );
};
