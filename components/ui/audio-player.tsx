import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExclusiveMediaPlayback } from '@/hooks/use-exclusive-media-playback';
import { cn } from '@/utilities/cn';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import { formatTime } from '@/utilities/format-time';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause } from 'phosphor-react-native/lib/module/icons/Pause';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import * as React from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';

export const AudioPlayer = ({
  compact,
  duration,
  uri,
}: {
  compact?: boolean;
  duration?: number;
  uri: string;
}) => {
  const src = useFileUriToSrc(uri);
  const colorScheme = useColorScheme();
  const player = useAudioPlayer(src, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const trackWidth = useSharedValue(0);
  const wasPlayingBeforeScrub = React.useRef(false);
  const isScrubbingRef = React.useRef(false);
  const [displayTime, setDisplayTime] = React.useState(0);

  const pausePlayback = React.useCallback(() => {
    player.pause();
  }, [player]);

  const { claimPlayback, releasePlayback } =
    useExclusiveMediaPlayback(pausePlayback);

  const playerDuration = Math.max(duration ?? status.duration, 0);

  const progress =
    playerDuration > 0
      ? Math.max(0, Math.min(displayTime / playerDuration, 1))
      : 0;

  const trackColor =
    colorScheme === 'dark'
      ? 'rgba(255, 255, 255, 0.10)'
      : 'rgba(0, 0, 0, 0.12)';

  const fillColor =
    colorScheme === 'dark'
      ? 'rgba(255, 255, 255, 0.80)'
      : 'rgba(0, 0, 0, 0.70)';

  React.useEffect(() => {
    if (isScrubbingRef.current) return;

    if (playerDuration <= 0) {
      setDisplayTime(0);
      return;
    }

    if (status.didJustFinish) {
      setDisplayTime(playerDuration);
      return;
    }

    setDisplayTime(Math.min(status.currentTime, playerDuration));
  }, [playerDuration, status.currentTime, status.didJustFinish]);

  React.useEffect(() => {
    if (!status.playing) {
      releasePlayback();
    }
  }, [releasePlayback, status.playing]);

  const handlePlay = async () => {
    if (!src) return;

    if (status.didJustFinish || displayTime >= playerDuration) {
      setDisplayTime(0);
      await player.seekTo(0);
    } else {
      await player.seekTo(displayTime);
    }

    await claimPlayback();
    player.play();
  };

  const startScrub = () => {
    isScrubbingRef.current = true;
    wasPlayingBeforeScrub.current = status.playing;
    if (status.playing) player.pause();
  };

  const commitSeek = async (seconds: number) => {
    setDisplayTime(seconds);
    await player.seekTo(seconds);
    isScrubbingRef.current = false;

    if (wasPlayingBeforeScrub.current) {
      await claimPlayback();
      player.play();
    }
  };

  const scrubTo = (x: number) => {
    'worklet';
    if (trackWidth.value <= 0 || playerDuration <= 0) return;
    const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
    runOnJS(setDisplayTime)(fraction * playerDuration);
  };

  const finishScrub = (x: number) => {
    'worklet';
    if (trackWidth.value <= 0 || playerDuration <= 0) return;
    const fraction = Math.max(0, Math.min(x / trackWidth.value, 1));
    runOnJS(commitSeek)(fraction * playerDuration);
  };

  const tap = Gesture.Tap().onEnd((e) => {
    'worklet';
    runOnJS(startScrub)();
    scrubTo(e.x);
    finishScrub(e.x);
  });

  const pan = Gesture.Pan()
    .onStart((e) => {
      'worklet';
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

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  };

  return (
    <View className="flex-row items-center">
      <Button
        className={cn('mr-3 rounded-full', compact ? 'size-6' : 'size-8')}
        disabled={!src}
        onPress={() => (status.playing ? player.pause() : void handlePlay())}
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
              className="relative h-1 overflow-hidden rounded-full"
              onLayout={onTrackLayout}
              style={{ backgroundColor: trackColor }}
            >
              <View
                className="absolute top-0 bottom-0 left-0 rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: fillColor,
                }}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
      <Text className="text-muted-foreground min-w-[40px] text-right text-xs">
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
