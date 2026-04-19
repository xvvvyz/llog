import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import * as video from '@/components/ui/video-player';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useUi } from '@/queries/use-ui';
import { Media } from '@/types/media';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { preloadMedia } from '@/utilities/file-uri-to-src';
import { CornersOut } from 'phosphor-react-native/lib/module/icons/CornersOut';
import { Pause } from 'phosphor-react-native/lib/module/icons/Pause';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { SpeakerHigh } from 'phosphor-react-native/lib/module/icons/SpeakerHigh';
import { SpeakerSlash } from 'phosphor-react-native/lib/module/icons/SpeakerSlash';
import * as React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  const scrollRef = React.useRef<ScrollView>(null);
  const windowDimensions = useWindowDimensions();
  const activeIndex = useSharedValue(defaultIndex);
  const enterFullscreenRef = React.useRef<(() => void) | null>(null);
  const hasAppliedInitialScroll = React.useRef(false);
  const previousContentWidthRef = React.useRef(0);
  const videoHandleRef = React.useRef<video.VideoPlayerHandle>(null);

  const [isActiveVideo, setIsActiveVideo] = React.useState(
    media[defaultIndex]?.type === 'video'
  );

  const { id: uiId, videoMuted } = useUi();
  const [isMuted, setIsMuted] = React.useState(videoMuted);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [activeIndexState, setActiveIndexState] = React.useState(defaultIndex);

  const contentHeight = windowDimensions.height - insets.top - insets.bottom;
  const contentWidth = windowDimensions.width;

  const preloadFromIndex = React.useCallback(
    async (index: number) => {
      const adjacent = [index - 1, index + 1, index - 2, index + 2];
      const preloadAdjacent = () => {
        const uris = adjacent
          .filter((i) => media[i] && media[i].type !== 'video')
          .map((i) => media[i]!.uri);

        uris.forEach((uri) => {
          void preloadMedia(uri);
        });
      };

      const current = media[index];

      if (current && current.type !== 'video') {
        await preloadMedia(current.uri);
        preloadAdjacent();
      } else {
        preloadAdjacent();
      }
    },
    [media]
  );

  React.useEffect(() => {
    void preloadFromIndex(defaultIndex);
  }, [defaultIndex, preloadFromIndex]);

  const setPage = React.useCallback(
    (index: number) => {
      scrollRef.current?.scrollTo({ x: index * contentWidth, animated: true });
    },
    [contentWidth]
  );

  React.useEffect(() => {
    if (contentWidth === 0) return;

    const previousContentWidth = previousContentWidthRef.current;
    const hasWidthChanged =
      hasAppliedInitialScroll.current &&
      previousContentWidth !== 0 &&
      previousContentWidth !== contentWidth;

    previousContentWidthRef.current = contentWidth;

    if (!hasAppliedInitialScroll.current || hasWidthChanged) {
      hasAppliedInitialScroll.current = true;
      const targetIndex = hasWidthChanged ? activeIndexState : defaultIndex;

      scrollRef.current?.scrollTo({
        x: targetIndex * contentWidth,
        animated: false,
      });
    }
  }, [activeIndexState, contentWidth, defaultIndex]);

  React.useEffect(() => {
    if (!isKeyboardNavigationEnabled || Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setPage(Math.max(0, activeIndex.value - 1));
      } else if (event.key === 'ArrowRight') {
        setPage(Math.min(media.length - 1, activeIndex.value + 1));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isKeyboardNavigationEnabled, media.length, activeIndex, setPage]);

  const handleFullscreenReady = React.useCallback((fn: () => void) => {
    enterFullscreenRef.current = fn;
  }, []);

  const handleFullscreen = React.useCallback(() => {
    enterFullscreenRef.current?.();
  }, []);

  const handleToggleMute = React.useCallback(() => {
    const muted = videoHandleRef.current?.toggleMute();

    if (muted != null) {
      setIsMuted(muted);
      if (uiId) db.transact(db.tx.ui[uiId].update({ videoMuted: muted }));
    }
  }, [uiId]);

  const handleTogglePlay = React.useCallback(() => {
    const playing = videoHandleRef.current?.togglePlay();
    if (playing != null) setIsPlaying(playing);
  }, []);

  const handleIndexChange = React.useCallback(
    (index: number) => {
      if (media[activeIndex.value]?.type === 'video') {
        const handle = videoHandleRef.current;
        if (handle && isPlaying) handle.togglePlay();
      }

      activeIndex.value = index;
      setActiveIndexState(index);
      void preloadFromIndex(index);
      const item = media[index];
      const isVideo = item?.type === 'video';
      setIsActiveVideo(isVideo);

      if (isVideo) {
        setIsPlaying(true);
      } else {
        enterFullscreenRef.current = null;
      }
    },
    [activeIndex, isPlaying, media, preloadFromIndex]
  );

  const lastReportedIndex = React.useRef(defaultIndex);

  const handleScroll = React.useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (contentWidth === 0) return;
      const page = Math.round(e.nativeEvent.contentOffset.x / contentWidth);

      if (
        page !== lastReportedIndex.current &&
        page >= 0 &&
        page < media.length
      ) {
        lastReportedIndex.current = page;
        handleIndexChange(page);
      }
    },
    [contentWidth, media.length, handleIndexChange]
  );

  return (
    <View className={cn('relative flex-1', className)}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="items-center"
        horizontal
        pagingEnabled
        ref={scrollRef}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
      >
        {media.map((item, index) => {
          const isActive = index === activeIndexState;
          const isAdjacent = Math.abs(index - activeIndexState) <= 2;

          return (
            <View
              className="items-center justify-center"
              key={item.id}
              style={{ width: contentWidth, height: contentHeight }}
            >
              {item.type === 'video' ? (
                isAdjacent ? (
                  <Pressable
                    className="w-full flex-1 items-center justify-center"
                    onPress={isActive ? handleTogglePlay : undefined}
                  >
                    <video.VideoPlayer
                      autoPlay={isActive}
                      handleRef={isActive ? videoHandleRef : undefined}
                      maxHeight={contentHeight}
                      maxWidth={contentWidth}
                      muted={isMuted}
                      onFullscreenReady={
                        isActive ? handleFullscreenReady : undefined
                      }
                      onPlayingChange={isActive ? setIsPlaying : undefined}
                      uri={item.uri}
                    />
                  </Pressable>
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
        })}
      </ScrollView>
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
            onPress={setPage}
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

const AnimatedDotView = Animated.createAnimatedComponent(View);

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

  const pan = React.useMemo(
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
    [activeIndex, count, lastScrubbed, onPress, startIndex]
  );

  return (
    <GestureDetector gesture={pan}>
      <View className="h-11 flex-1 items-center justify-center">
        <View className="h-2 overflow-hidden" style={{ width: containerWidth }}>
          <Animated.View className="flex-row" style={{ gap: DOT_GAP }}>
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
    <AnimatedDotView style={[{ width: DOT_SIZE, height: DOT_SIZE }, style]}>
      <View className="h-full w-full rounded-full bg-foreground shadow-xl" />
    </AnimatedDotView>
  );
};
