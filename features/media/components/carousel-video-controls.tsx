import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { SpeakerHigh, SpeakerSlash } from 'phosphor-react-native';
import * as React from 'react';
import { type LayoutChangeEvent, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';

type CarouselVideoControlsProps = {
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isSwiping: boolean;
  onScrubEnd: (seconds: number) => void;
  onScrubMove: (seconds: number) => void;
  onScrubStart: () => void;
  onToggleMute: () => void;
  scrubberBottomOffset: number;
  videoButtonsBottomOffset: number;
};

export const CarouselVideoControls = ({
  currentTime,
  duration,
  isMuted,
  isSwiping,
  onScrubEnd,
  onScrubMove,
  onScrubStart,
  onToggleMute,
  scrubberBottomOffset,
  videoButtonsBottomOffset,
}: CarouselVideoControlsProps) => {
  if (isSwiping) return null;

  return (
    <React.Fragment>
      {duration > 0 && (
        <View
          className="absolute right-4 z-10 mr-0.5 gap-1 items-end md:right-8"
          style={{ bottom: videoButtonsBottomOffset }}
        >
          <Button
            className="size-11"
            onPress={onToggleMute}
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
      )}
      <View
        style={{ bottom: scrubberBottomOffset }}
        className={cn(
          'absolute right-4 left-4 z-10 md:right-8 md:left-8',
          'h-8 justify-center px-3',
          duration > 0
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
      >
        <VideoScrubber
          currentTime={currentTime}
          duration={duration}
          onScrubEnd={onScrubEnd}
          onScrubMove={onScrubMove}
          onScrubStart={onScrubStart}
        />
      </View>
    </React.Fragment>
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
      <Text className="min-w-[40px] leading-4 text-muted-foreground text-xs">
        {formatTime(currentTime)}
      </Text>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <Animated.View className="flex-1 h-8 justify-center self-stretch">
          <View
            className="relative overflow-hidden h-1 rounded-full bg-progress-track"
            onLayout={handleTrackLayout}
          >
            <View
              className="absolute bottom-0 left-0 top-0 rounded-full bg-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
        </Animated.View>
      </GestureDetector>
      <Text className="min-w-[40px] leading-4 text-muted-foreground text-right text-xs">
        {formatTime(duration)}
      </Text>
    </View>
  );
};
