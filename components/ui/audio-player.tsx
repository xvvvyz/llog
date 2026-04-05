import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { fileUriToSrc } from '@/utilities/file-uri-to-src';
import { formatTime } from '@/utilities/format-time';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export const AudioPlayer = ({
  compact,
  duration,
  uri,
}: {
  compact?: boolean;
  duration?: number;
  uri: string;
}) => {
  const player = useAudioPlayer(fileUriToSrc(uri), { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const trackWidth = useSharedValue(0);
  const progressFraction = useSharedValue(0);
  const isScrubbing = useSharedValue(false);
  const wasPlayingBeforeScrub = useRef(false);
  const [displayTime, setDisplayTime] = useState(0);
  const playerDuration = duration ?? status.duration;

  useEffect(() => {
    if (isScrubbing.value || playerDuration <= 0) return;

    if (status.didJustFinish) {
      cancelAnimation(progressFraction);
      progressFraction.value = 1;
      setDisplayTime(playerDuration);
      return;
    }

    if (!status.playing) return;
    const fraction = Math.min(status.currentTime / playerDuration, 1);
    setDisplayTime(status.currentTime);
    cancelAnimation(progressFraction);
    progressFraction.value = fraction;
    const remaining = (1 - fraction) * playerDuration * 1000;

    progressFraction.value = withTiming(1, {
      duration: remaining,
      easing: Easing.linear,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progressFraction and isScrubbing are shared values written to, not read
  }, [
    status.currentTime,
    status.playing,
    status.didJustFinish,
    playerDuration,
  ]);

  const handlePlay = async () => {
    cancelAnimation(progressFraction);

    if (status.didJustFinish || displayTime >= playerDuration) {
      progressFraction.value = 0;
      setDisplayTime(0);
      await player.seekTo(0);
    } else {
      await player.seekTo(displayTime);
    }

    player.play();
  };

  const startScrub = () => {
    wasPlayingBeforeScrub.current = status.playing;
    if (status.playing) player.pause();
  };

  const commitSeek = async (seconds: number) => {
    await player.seekTo(seconds);
    isScrubbing.value = false;

    if (wasPlayingBeforeScrub.current) {
      player.play();
    }
  };

  const scrubTo = (x: number) => {
    'worklet';
    const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
    cancelAnimation(progressFraction);
    progressFraction.value = fraction;
    runOnJS(setDisplayTime)(fraction * playerDuration);
  };

  const finishScrub = (x: number) => {
    'worklet';
    const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
    cancelAnimation(progressFraction);
    progressFraction.value = fraction;
    runOnJS(commitSeek)(fraction * playerDuration);
  };

  const tap = Gesture.Tap().onEnd((e) => {
    'worklet';
    isScrubbing.value = true;
    runOnJS(startScrub)();
    scrubTo(e.x);
    finishScrub(e.x);
  });

  const pan = Gesture.Pan()
    .onStart((e) => {
      'worklet';
      isScrubbing.value = true;
      runOnJS(startScrub)();
      scrubTo(e.x);
    })
    .onUpdate((e) => {
      'worklet';
      scrubTo(e.x);
    })
    .onEnd((e) => {
      'worklet';
      finishScrub(e.x);
    });

  const gesture = Gesture.Race(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.min(progressFraction.value * 100, 100)}%`,
  }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  };

  return (
    <View className="flex-row items-center">
      <Button
        className={cn('mr-3 rounded-full', compact ? 'size-6' : 'size-8')}
        onPress={() => (status.playing ? player.pause() : handlePlay())}
        size="icon"
        variant="secondary"
      >
        <Icon icon={status.playing ? Pause : Play} size={compact ? 12 : 16} />
      </Button>
      <GestureHandlerRootView className="flex-1 self-stretch">
        <GestureDetector gesture={gesture}>
          <Animated.View
            className={cn('flex-1 justify-center', compact ? 'h-6' : 'h-8')}
          >
            <View
              className="h-1 overflow-hidden rounded-full bg-border"
              onLayout={onTrackLayout}
            >
              <Animated.View
                className="h-1 rounded-full bg-foreground"
                style={animatedStyle}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
      <Text className="min-w-[40px] text-right text-xs text-muted-foreground">
        {formatTime(status.playing ? displayTime : playerDuration)}
      </Text>
    </View>
  );
};

export const AudioPlaylist = ({
  clips,
  compact,
}: {
  clips: { id: string; uri: string; duration?: number }[];
  compact?: boolean;
}) => (
  <>
    {clips.map((clip) => (
      <AudioPlayer
        key={clip.id}
        compact={compact}
        duration={clip.duration}
        uri={clip.uri}
      />
    ))}
  </>
);
