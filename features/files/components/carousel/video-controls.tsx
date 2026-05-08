import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Pause, Play, SpeakerHigh, SpeakerSlash } from 'phosphor-react-native';
import * as React from 'react';
import { type LayoutChangeEvent, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';

type VideoControlsProps = {
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isPlaying: boolean;
  isSwiping: boolean;
  onScrubEnd: (seconds: number) => void;
  onScrubMove: (seconds: number) => void;
  onScrubStart: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  scrubberBottomOffset: number;
};

export const VideoControls = ({
  currentTime,
  duration,
  isMuted,
  isPlaying,
  isSwiping,
  onScrubEnd,
  onScrubMove,
  onScrubStart,
  onToggleMute,
  onTogglePlay,
  scrubberBottomOffset,
}: VideoControlsProps) => {
  return (
    <React.Fragment>
      <View className="absolute inset-x-0 top-0 z-[5] h-32 bg-gradient-to-b from-[#0d0d0d] to-[#0d0d0d]/0 via-[#0d0d0d]/55 pointer-events-none" />
      <View className="absolute bottom-0 inset-x-0 z-[5] h-32 bg-gradient-to-t from-[#0d0d0d] to-[#0d0d0d]/0 via-[#0d0d0d]/55 pointer-events-none" />
      {duration > 0 && (
        <View
          style={{ bottom: scrubberBottomOffset }}
          className={cn(
            'absolute right-4 left-4 z-10 h-11 flex-row items-center gap-3 md:right-8 md:left-8',
            isSwiping ? 'pointer-events-none' : 'pointer-events-auto'
          )}
        >
          <Button
            className="size-11"
            onPress={onTogglePlay}
            size="icon"
            variant="link"
            wrapperClassName="md:-ml-4 md:mr-4"
          >
            <Icon
              className="text-white/80"
              icon={isPlaying ? Pause : Play}
              size={Platform.select({ default: 24, ios: 22 })}
              weight={isPlaying ? 'regular' : 'fill'}
            />
          </Button>
          <View className="flex-1 min-w-0">
            <VideoScrubber
              currentTime={currentTime}
              duration={duration}
              onScrubEnd={onScrubEnd}
              onScrubMove={onScrubMove}
              onScrubStart={onScrubStart}
            />
          </View>
          <Button
            className="size-11"
            onPress={onToggleMute}
            size="icon"
            variant="link"
            wrapperClassName="md:ml-4 md:-mr-4"
          >
            <Icon
              className="text-white/80"
              icon={isMuted ? SpeakerSlash : SpeakerHigh}
              size={Platform.select({ default: 24, ios: 22 })}
            />
          </Button>
        </View>
      )}
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
      <Text className="min-w-[40px] leading-4 text-white/60 text-xs">
        {formatTime(currentTime)}
      </Text>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <Animated.View className="flex-1 h-8 justify-center self-stretch">
          <View
            className="relative overflow-hidden h-1 border-continuous rounded-full bg-white/10"
            onLayout={handleTrackLayout}
          >
            <View
              className="absolute bottom-0 left-0 top-0 border-continuous rounded-full bg-white/80"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
        </Animated.View>
      </GestureDetector>
      <Text className="min-w-[40px] leading-4 text-right text-white/60 text-xs">
        {formatTime(duration)}
      </Text>
    </View>
  );
};
