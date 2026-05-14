import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import * as React from 'react';
import { type LayoutChangeEvent, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';

import {
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  WifiSlash,
} from 'phosphor-react-native';

type VideoControlsProps = {
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isUnavailableOffline: boolean;
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
  isUnavailableOffline,
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
            disabled={isUnavailableOffline}
            onPress={onTogglePlay}
            size="icon"
            variant="link"
            wrapperClassName="md:-ml-4 md:mr-4"
          >
            <Icon
              className="text-popover-foreground"
              icon={isUnavailableOffline ? WifiSlash : isPlaying ? Pause : Play}
              size={Platform.select({ default: 24, ios: 22 })}
              weight={!isUnavailableOffline && !isPlaying ? 'fill' : 'regular'}
            />
          </Button>
          <View className="flex-1 min-w-0">
            <VideoScrubber
              currentTime={currentTime}
              disabled={isUnavailableOffline}
              duration={duration}
              onScrubEnd={onScrubEnd}
              onScrubMove={onScrubMove}
              onScrubStart={onScrubStart}
            />
          </View>
          <Button
            className="size-11"
            disabled={isUnavailableOffline}
            onPress={onToggleMute}
            size="icon"
            variant="link"
            wrapperClassName="md:ml-4 md:-mr-4"
          >
            <Icon
              className="text-popover-foreground"
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
  disabled,
  onScrubEnd,
  onScrubMove,
  onScrubStart,
}: {
  currentTime: number;
  duration: number;
  disabled?: boolean;
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

  const track = (
    <Animated.View className="flex-1 h-8 justify-center self-stretch">
      <View
        className="relative overflow-hidden h-1 border-continuous rounded-full bg-popover-foreground/10"
        onLayout={handleTrackLayout}
      >
        <View
          className="absolute bottom-0 left-0 top-0 border-continuous rounded-full bg-popover-foreground"
          style={{ width: `${progress * 100}%` }}
        />
      </View>
    </Animated.View>
  );

  return (
    <View className="flex-row items-center">
      <Text className="min-w-10 font-medium leading-4 text-popover-foreground text-xs">
        {formatTime(currentTime)}
      </Text>
      {disabled ? (
        track
      ) : (
        <GestureDetector gesture={Gesture.Race(pan, tap)}>
          {track}
        </GestureDetector>
      )}
      <Text className="min-w-10 font-medium leading-4 text-popover-foreground text-right text-xs">
        {formatTime(duration)}
      </Text>
    </View>
  );
};
