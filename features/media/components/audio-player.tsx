import { AudioPlaybackRateButton } from '@/features/media/components/audio-playback-rate-button';
import { createAudioPlaylist } from '@/features/media/components/audio-playlist';
import { useNativeAudioPlayerController } from '@/features/media/hooks/use-native-audio-player-controller';
import type { AudioPlayerProps } from '@/features/media/types/audio-player.types';
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
  const { compact, showPlaybackRate = true } = props;

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
  } = useNativeAudioPlayerController(props);

  return (
    <View className="flex-row min-w-0 items-center">
      <Button
        className={cn('mr-3 rounded-full', compact ? 'size-6' : 'size-8')}
        disabled={isDisabled}
        onPress={togglePlayback}
        size="icon"
        variant="secondary"
      >
        <Icon icon={isPlaying ? Pause : Play} size={compact ? 12 : 16} />
      </Button>
      <GestureDetector gesture={gesture}>
        <Animated.View
          className={cn(
            'flex-1 justify-center self-stretch',
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
        </Animated.View>
      </GestureDetector>
      <Text className="ml-3 min-w-[40px] text-left text-muted-foreground text-xs">
        {formatTime(isPlaying ? displayTime : playerDuration)}
      </Text>
      {showPlaybackRate && (
        <AudioPlaybackRateButton
          compact={compact}
          disabled={isDisabled}
          onPlaybackRateChange={handlePlaybackRateChange}
          playbackRate={currentPlaybackRate}
        />
      )}
    </View>
  );
};

export const AudioPlaylist = createAudioPlaylist(AudioPlayer);
