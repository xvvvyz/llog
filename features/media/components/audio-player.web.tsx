import { AudioPlaybackRateButton } from '@/features/media/components/audio-playback-rate-button';
import { createAudioPlaylist } from '@/features/media/components/audio-playlist';
import { useWebAudioPlayerController } from '@/features/media/hooks/use-web-audio-player-controller';
import type { AudioPlayerProps } from '@/features/media/types/audio-player.types';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Pause, Play } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

export const AudioPlayer = (props: AudioPlayerProps) => {
  const { compact, showPlaybackRate = true } = props;

  const {
    audioRef,
    audioSrc,
    currentPlaybackRate,
    displayTime,
    handlePlaybackRateChange,
    handlePlayButtonPointerDown,
    handlePlayButtonPress,
    isPlaybackRateDisabled,
    isPlayButtonDisabled,
    isPlaying,
    playerDuration,
    setFillElement,
    timeTextRef,
    trackRef,
  } = useWebAudioPlayerController(props);

  return (
    <View className="flex-row min-w-0 items-center">
      <audio ref={audioRef} preload="metadata" src={audioSrc ?? undefined} />
      <Button
        className={cn('mr-3 rounded-full', compact ? 'size-6' : 'size-8')}
        disabled={isPlayButtonDisabled}
        onPointerDown={handlePlayButtonPointerDown}
        onPress={handlePlayButtonPress}
        size="icon"
        variant="secondary"
      >
        <Icon icon={isPlaying ? Pause : Play} size={compact ? 12 : 16} />
      </Button>
      <div
        ref={trackRef}
        className={cn(
          'flex flex-1 cursor-pointer touch-none items-center self-stretch',
          compact ? 'h-6' : 'h-8'
        )}
      >
        <div className="overflow-hidden h-1 w-full rounded-full bg-progress-track">
          <div
            ref={setFillElement}
            className="h-full rounded-full bg-progress-fill origin-left will-change-transform"
          />
        </div>
      </div>
      <span
        ref={timeTextRef}
        className="ml-3 min-w-[40px] text-left text-muted-foreground text-xs select-none"
      >
        {formatTime(isPlaying ? displayTime : playerDuration)}
      </span>
      {showPlaybackRate && (
        <AudioPlaybackRateButton
          compact={compact}
          disabled={isPlaybackRateDisabled}
          onPlaybackRateChange={handlePlaybackRateChange}
          playbackRate={currentPlaybackRate}
        />
      )}
    </View>
  );
};

export const AudioPlaylist = createAudioPlaylist(AudioPlayer);
