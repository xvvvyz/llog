import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import * as video from '@/components/ui/video-player';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { useUi } from '@/queries/use-ui';
import { Media } from '@/types/media';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { preloadMedia } from '@/utilities/file-uri-to-src';
import { formatTime } from '@/utilities/format-time';
import { SpeakerHigh } from 'phosphor-react-native/lib/module/icons/SpeakerHigh';
import { SpeakerSlash } from 'phosphor-react-native/lib/module/icons/SpeakerSlash';
import * as React from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
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
}: {
  className?: string;
  defaultIndex?: number;
  media: Media[];
  isKeyboardNavigationEnabled?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const windowDimensions = useWindowDimensions();
  const activeIndex = useSharedValue(defaultIndex);
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
  const [videoCurrentTime, setVideoCurrentTime] = React.useState(0);
  const [videoDuration, setVideoDuration] = React.useState(0);
  const isScrubbingVideoRef = React.useRef(false);
  const wasPlayingBeforeVideoScrubRef = React.useRef(false);
  const scrubPreviewFrameRef = React.useRef<number | null>(null);
  const scrubPreviewTargetRef = React.useRef<number | null>(null);

  const contentHeight = windowDimensions.height - insets.top - insets.bottom;
  const contentWidth = windowDimensions.width;
  const dotsBottomOffset = 12 + insets.bottom;
  const scrubberBottomOffset = 44 + insets.bottom;
  const videoButtonsBottomOffset = 88 + insets.bottom;

  const preloadFromIndex = React.useCallback(
    async (index: number) => {
      const adjacent = [index - 1, index + 1, index - 2, index + 2];

      const getPreviewUri = (item?: Media) =>
        item?.type === 'video' ? item.thumbnailUri : item?.uri;

      const preloadAdjacent = () => {
        const uris = adjacent
          .map((i) => getPreviewUri(media[i]))
          .filter((uri): uri is string => Boolean(uri));

        uris.forEach((uri) => {
          void preloadMedia(uri);
        });
      };

      const current = media[index];
      const currentPreviewUri = getPreviewUri(current);

      if (currentPreviewUri) {
        await preloadMedia(currentPreviewUri);
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

  React.useEffect(() => {
    return () => {
      if (scrubPreviewFrameRef.current != null) {
        cancelAnimationFrame(scrubPreviewFrameRef.current);
      }
    };
  }, []);

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

  const handleVideoTimeChange = React.useCallback(
    (currentTime: number, duration: number) => {
      if (isScrubbingVideoRef.current) return;
      setVideoCurrentTime(Math.max(0, currentTime));
      setVideoDuration(Math.max(0, duration));
    },
    []
  );

  const startVideoScrub = React.useCallback(() => {
    const handle = videoHandleRef.current;
    if (!handle || videoDuration <= 0) return;
    isScrubbingVideoRef.current = true;
    wasPlayingBeforeVideoScrubRef.current = isPlaying;
    handle.setScrubbingEnabled(true);

    if (isPlaying) {
      handle.pause();
    }
  }, [isPlaying, videoDuration]);

  const previewVideoScrub = React.useCallback(
    (seconds: number) => {
      const nextTime = Math.max(0, Math.min(seconds, videoDuration));
      scrubPreviewTargetRef.current = nextTime;
      if (scrubPreviewFrameRef.current != null) return;

      scrubPreviewFrameRef.current = requestAnimationFrame(() => {
        scrubPreviewFrameRef.current = null;
        const targetTime = scrubPreviewTargetRef.current;
        scrubPreviewTargetRef.current = null;
        if (targetTime == null) return;
        setVideoCurrentTime(targetTime);
        videoHandleRef.current?.seekTo(targetTime);
      });
    },
    [videoDuration]
  );

  const commitVideoScrub = React.useCallback(
    (seconds: number) => {
      const handle = videoHandleRef.current;
      const nextTime = Math.max(0, Math.min(seconds, videoDuration));

      if (scrubPreviewFrameRef.current != null) {
        cancelAnimationFrame(scrubPreviewFrameRef.current);
        scrubPreviewFrameRef.current = null;
      }

      scrubPreviewTargetRef.current = null;
      setVideoCurrentTime(nextTime);
      handle?.setScrubbingEnabled(false);
      handle?.seekTo(nextTime);
      isScrubbingVideoRef.current = false;

      if (wasPlayingBeforeVideoScrubRef.current) {
        handle?.play();
      }
    },
    [videoDuration]
  );

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

      if (scrubPreviewFrameRef.current != null) {
        cancelAnimationFrame(scrubPreviewFrameRef.current);
        scrubPreviewFrameRef.current = null;
      }

      scrubPreviewTargetRef.current = null;
      videoHandleRef.current?.setScrubbingEnabled(false);
      isScrubbingVideoRef.current = false;
      wasPlayingBeforeVideoScrubRef.current = false;
      setVideoCurrentTime(0);
      setVideoDuration(0);

      if (isVideo) {
        setIsPlaying(true);
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

          const previewUri =
            item.type === 'video' ? (item.thumbnailUri ?? null) : item.uri;

          return (
            <View
              className="items-center justify-center"
              key={item.id}
              style={{ width: contentWidth, height: contentHeight }}
            >
              {item.type === 'video' ? (
                <View className="bg-background relative w-full flex-1 items-center justify-center">
                  {!!previewUri && (
                    <Image
                      contentFit="contain"
                      fill
                      uri={previewUri}
                      wrapperClassName="bg-background"
                    />
                  )}
                  {isAdjacent ? (
                    <Pressable
                      className="absolute inset-0 items-center justify-center"
                      onPress={isActive ? handleTogglePlay : undefined}
                    >
                      <video.VideoPlayer
                        autoPlay={isActive}
                        handleRef={isActive ? videoHandleRef : undefined}
                        maxHeight={contentHeight}
                        maxWidth={contentWidth}
                        muted={isMuted}
                        onPlayingChange={isActive ? setIsPlaying : undefined}
                        onTimeChange={
                          isActive ? handleVideoTimeChange : undefined
                        }
                        thumbnailUri={item.thumbnailUri}
                        uri={item.uri}
                      />
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Image
                  contentFit="contain"
                  fill
                  uri={item.uri}
                  wrapperClassName="bg-background"
                />
              )}
            </View>
          );
        })}
      </ScrollView>
      {isActiveVideo && (
        <>
          <View
            className="absolute right-4 z-10 mr-0.5 items-end gap-1 md:right-8"
            style={{ bottom: videoButtonsBottomOffset }}
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
          </View>
          <View
            className={cn(
              'absolute right-4 left-4 z-10 md:right-8 md:left-8',
              'h-8 justify-center px-3',
              videoDuration > 0 ? 'pointer-events-auto' : 'pointer-events-none'
            )}
            style={{
              bottom: scrubberBottomOffset,
              opacity: videoDuration > 0 ? 1 : 0,
            }}
          >
            <VideoScrubber
              currentTime={videoCurrentTime}
              duration={videoDuration}
              onScrubEnd={commitVideoScrub}
              onScrubMove={previewVideoScrub}
              onScrubStart={startVideoScrub}
            />
          </View>
        </>
      )}
      <View
        className="pointer-events-none absolute right-4 left-4 z-10 items-center md:right-8 md:left-8"
        style={{ bottom: dotsBottomOffset }}
      >
        {media.length > 1 && (
          <Dots activeIndex={activeIndex} count={media.length} />
        )}
      </View>
    </View>
  );
};

const VideoScrubber = ({
  currentTime,
  duration,
  onScrubEnd,
  onScrubMove,
  onScrubStart,
}: {
  currentTime: number;
  duration: number;
  onScrubEnd: (seconds: number) => void;
  onScrubMove: (seconds: number) => void;
  onScrubStart: () => void;
}) => {
  const trackWidth = useSharedValue(0);

  const progress =
    duration > 0 ? Math.max(0, Math.min(currentTime / duration, 1)) : 0;

  const scrubTo = React.useCallback(
    (x: number) => {
      if (trackWidth.value <= 0 || duration <= 0) return;
      const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
      onScrubMove(fraction * duration);
    },
    [duration, onScrubMove, trackWidth]
  );

  const finishScrub = React.useCallback(
    (x: number) => {
      if (trackWidth.value <= 0 || duration <= 0) return;
      const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
      onScrubEnd(fraction * duration);
    },
    [duration, onScrubEnd, trackWidth]
  );

  const tap = React.useMemo(
    () =>
      Gesture.Tap().onEnd((e) => {
        'worklet';
        runOnJS(onScrubStart)();
        runOnJS(scrubTo)(e.x);
        runOnJS(finishScrub)(e.x);
      }),
    [finishScrub, onScrubStart, scrubTo]
  );

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .onStart((e) => {
          'worklet';
          runOnJS(onScrubStart)();
          runOnJS(scrubTo)(e.x);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(scrubTo)(e.x);
        })
        .onEnd((e) => {
          'worklet';
          runOnJS(finishScrub)(e.x);
        }),
    [finishScrub, onScrubStart, scrubTo]
  );

  const handleTrackLayout = React.useCallback(
    (e: LayoutChangeEvent) => {
      trackWidth.value = e.nativeEvent.layout.width;
    },
    [trackWidth]
  );

  return (
    <View className="flex-row items-center">
      <Text className="text-muted-foreground min-w-[40px] text-xs leading-4">
        {formatTime(currentTime)}
      </Text>
      <GestureHandlerRootView className="flex-1 self-stretch">
        <GestureDetector gesture={Gesture.Race(pan, tap)}>
          <Animated.View className="h-8 flex-1 justify-center">
            <View
              className="bg-border relative h-1 overflow-hidden rounded-full"
              onLayout={handleTrackLayout}
            >
              <View
                className="bg-foreground absolute top-0 bottom-0 left-0 rounded-full"
                style={{
                  width: `${progress * 100}%`,
                }}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
      <Text className="text-muted-foreground min-w-[40px] text-right text-xs leading-4">
        {formatTime(duration)}
      </Text>
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
}: {
  activeIndex: SharedValue<number>;
  count: number;
}) => {
  const visibleCount = Math.min(count, MAX_DOTS);
  const containerWidth = visibleCount * DOT_SIZE + (visibleCount - 1) * DOT_GAP;

  return (
    <View className="h-2 overflow-hidden" style={{ width: containerWidth }}>
      <Animated.View className="flex-row" style={{ gap: DOT_GAP }}>
        {Array.from({ length: count }, (_, i) => (
          <Dot activeIndex={activeIndex} count={count} index={i} key={i} />
        ))}
      </Animated.View>
    </View>
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
      <View className="bg-foreground h-full w-full rounded-full shadow-xl" />
    </AnimatedDotView>
  );
};
