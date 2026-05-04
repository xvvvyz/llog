import { createAudioPlaylist } from '@/features/files/components/audio-playlist';
import { PlaybackRateButton } from '@/features/files/components/playback-rate-button';
import { useAudioPlayerController } from '@/features/files/hooks/use-audio-player-controller';
import type { AudioPlayerProps } from '@/features/files/types/audio-player';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { FastForward, Pause, Play, Rewind } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const AUDIO_SEEK_STEP_SECONDS = 5;

export const AudioPlayer = (props: AudioPlayerProps) => {
  const { showPlaybackRate = true, trailingAccessory } = props;
  const showDefaultPlaybackRate = showPlaybackRate && !trailingAccessory;

  const hasTrailingControls =
    trailingAccessory != null || showDefaultPlaybackRate;

  const {
    currentPlaybackRate,
    gesture,
    handlePlaybackRateChange,
    handleTrackLayout,
    isDisabled,
    isPlaying,
    progress,
    seekBy,
    timeLabelTime,
    togglePlayback,
  } = useAudioPlayerController(props);

  return (
    <View
      className={cn(
        'flex-row min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border-secondary bg-secondary border-continuous',
        'h-8 min-h-8 max-h-8 px-0',
        !hasTrailingControls && 'pr-3'
      )}
    >
      <Button
        disabled={isDisabled}
        onPress={togglePlayback}
        size="icon-sm"
        variant="ghost"
      >
        <Icon icon={isPlaying ? Pause : Play} size={16} />
      </Button>
      <View className="flex-1 flex-row h-8 min-w-0 gap-2 items-center">
        <View className="relative flex-1 h-8 min-w-0 justify-center">
          <View
            className="relative overflow-hidden h-1 w-full border-continuous rounded-full bg-progress-track"
            onLayout={handleTrackLayout}
          >
            <View
              className="absolute bottom-0 left-0 top-0 border-continuous rounded-full bg-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <GestureDetector gesture={gesture}>
            <Animated.View className="absolute -bottom-2 -top-2 left-0 right-0" />
          </GestureDetector>
        </View>
        <Text className="leading-tight text-placeholder text-right text-xs shrink-0 tabular-nums">
          {formatTime(timeLabelTime)}
        </Text>
      </View>
      {trailingAccessory ??
        (showDefaultPlaybackRate && (
          <View className="flex-row items-center shrink-0">
            <PlaybackRateButton
              disabled={isDisabled}
              onPlaybackRateChange={handlePlaybackRateChange}
              playbackRate={currentPlaybackRate}
            />
            <Button
              accessibilityLabel="Back 5 seconds"
              disabled={isDisabled}
              onPress={() => seekBy(-AUDIO_SEEK_STEP_SECONDS)}
              size="icon-sm"
              variant="ghost"
            >
              <Icon icon={Rewind} size={16} />
            </Button>
            <Button
              accessibilityLabel="Forward 5 seconds"
              disabled={isDisabled}
              onPress={() => seekBy(AUDIO_SEEK_STEP_SECONDS)}
              size="icon-sm"
              variant="ghost"
            >
              <Icon icon={FastForward} size={16} />
            </Button>
          </View>
        ))}
    </View>
  );
};

export const AudioPlaylist = createAudioPlaylist(AudioPlayer);
