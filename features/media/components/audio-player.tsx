import { createAudioPlaylist } from '@/features/media/components/audio-playlist';
import { PlaybackRateButton } from '@/features/media/components/playback-rate-button';
import { useAudioPlayerController } from '@/features/media/hooks/use-audio-player-controller';
import type { AudioPlayerProps } from '@/features/media/types/audio-player';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Pause, Play } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

export const AudioPlayer = (props: AudioPlayerProps) => {
  const { compact, showPlaybackRate = true, trailingAccessory } = props;

  const {
    currentPlaybackRate,
    displayTime,
    gesture,
    handlePlaybackRateChange,
    handleTrackLayout,
    isDisabled,
    isPlaying,
    playerDuration,
    progress,
    togglePlayback,
  } = useAudioPlayerController(props);

  return (
    <View
      className={cn(
        'flex-row min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border-secondary bg-secondary',
        compact ? 'h-6 px-0' : 'h-8 px-0'
      )}
    >
      <Button
        className={cn(compact && 'size-6 rounded-lg')}
        disabled={isDisabled}
        onPress={togglePlayback}
        size={compact ? 'icon' : 'icon-sm'}
        variant="ghost"
        wrapperClassName={cn(compact && 'rounded-lg')}
      >
        <Icon icon={isPlaying ? Pause : Play} size={compact ? 12 : 16} />
      </Button>
      <View
        className={cn(
          'flex-row flex-1 min-w-0 items-center gap-2',
          compact ? 'h-6' : 'h-8'
        )}
      >
        <View
          className={cn(
            'relative flex-1 min-w-0 justify-center',
            compact ? 'h-6' : 'h-8'
          )}
        >
          <View
            className="relative overflow-hidden h-1 w-full rounded-full bg-progress-track"
            onLayout={handleTrackLayout}
          >
            <View
              className="absolute bottom-0 left-0 top-0 rounded-full bg-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <GestureDetector gesture={gesture}>
            <Animated.View className="absolute -bottom-2 -top-2 left-0 right-0" />
          </GestureDetector>
        </View>
        <Text className="leading-tight text-placeholder text-right text-xs shrink-0 tabular-nums">
          {formatTime(isPlaying ? displayTime : playerDuration)}
        </Text>
      </View>
      {trailingAccessory ??
        (showPlaybackRate && (
          <PlaybackRateButton
            compact={compact}
            disabled={isDisabled}
            onPlaybackRateChange={handlePlaybackRateChange}
            playbackRate={currentPlaybackRate}
          />
        ))}
    </View>
  );
};

export const AudioPlaylist = createAudioPlaylist(AudioPlayer);
