import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { SpeakerHigh } from 'phosphor-react-native/lib/module/icons/SpeakerHigh';
import { SpeakerSlash } from 'phosphor-react-native/lib/module/icons/SpeakerSlash';
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
          className="absolute right-4 z-10 mr-0.5 items-end gap-1 md:right-8"
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
        className={cn(
          'absolute right-4 left-4 z-10 md:right-8 md:left-8',
          'h-8 justify-center px-3',
          duration > 0 ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        style={{
          bottom: scrubberBottomOffset,
          opacity: duration > 0 ? 1 : 0,
        }}
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
      <Text className="text-muted-foreground min-w-[40px] text-xs leading-4">
        {formatTime(currentTime)}
      </Text>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <Animated.View className="h-8 flex-1 justify-center self-stretch">
          <View
            className="bg-progress-track relative h-1 overflow-hidden rounded-full"
            onLayout={handleTrackLayout}
          >
            <View
              className="bg-progress-fill absolute top-0 bottom-0 left-0 rounded-full"
              style={{
                width: `${progress * 100}%`,
              }}
            />
          </View>
        </Animated.View>
      </GestureDetector>
      <Text className="text-muted-foreground min-w-[40px] text-right text-xs leading-4">
        {formatTime(duration)}
      </Text>
    </View>
  );
};
