import { AudioPlaybackRateButton } from '@/features/media/components/audio-playback-rate-button';
import { createAudioPlaylist } from '@/features/media/components/audio-playlist';
import { useWebAudioPlayerController } from '@/features/media/hooks/use-web-audio-player-controller';
import type { AudioPlayerProps } from '@/features/media/types/audio-player.types';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format-time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Pause } from 'phosphor-react-native/lib/module/icons/Pause';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
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
    <View className="min-w-0 flex-row items-center">
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
        className={cn(
          'flex flex-1 cursor-pointer touch-none items-center self-stretch',
          compact ? 'h-6' : 'h-8'
        )}
        ref={trackRef}
      >
        <div className="bg-progress-track h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-progress-fill h-full origin-left rounded-full will-change-transform"
            ref={setFillElement}
          />
        </div>
      </div>
      <span
        className="text-muted-foreground ml-3 min-w-[40px] text-left text-xs select-none"
        ref={timeTextRef}
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
