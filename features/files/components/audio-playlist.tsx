import { useAudioPlaylistPlayback } from '@/features/files/hooks/use-audio-playlist-playback';
import { useUiAudioPlaybackRate } from '@/features/files/hooks/use-ui-audio-playback-rate';
import type * as audioPlayerTypes from '@/features/files/types/audio-player';
import { cn } from '@/lib/cn';
import { durationMsToSeconds } from '@/lib/duration';
import { PressPropagationBoundary } from '@/ui/press-propagation-boundary';
import type * as React from 'react';

type AudioPlayerComponent =
  React.ComponentType<audioPlayerTypes.AudioPlayerProps>;

type AudioPlaylistProps = {
  className?: string;
  clips: audioPlayerTypes.AudioClip[];
};

export const createAudioPlaylist = (AudioPlayer: AudioPlayerComponent) => {
  const AudioPlaylist = ({ className, clips }: AudioPlaylistProps) => {
    const {
      activeAutoPlayKey,
      activeItem: activeClip,
      handleDidFinish,
      handlePause,
      handlePlayStart,
      showNext,
      showPrevious,
    } = useAudioPlaylistPlayback(clips);

    const {
      audioPlaybackRate: playbackRate,
      setAudioPlaybackRate: setPlaybackRate,
    } = useUiAudioPlaybackRate();

    if (!activeClip) return null;

    return (
      <PressPropagationBoundary className={cn('min-w-0 gap-2', className)}>
        {clips.map((clip, index) => (
          <AudioPlayer
            key={clip.id}
            assetKey={clip.assetKey}
            durationSeconds={durationMsToSeconds(clip.duration)}
            name={clip.name}
            onDidFinish={() => handleDidFinish(index)}
            onNextClip={clips.length > 1 ? showNext : undefined}
            onPause={handlePause}
            onPlaybackRateChange={setPlaybackRate}
            onPlayStart={() => handlePlayStart(index)}
            onPreviousClip={clips.length > 1 ? showPrevious : undefined}
            playbackRate={playbackRate}
            tracks={clip.tracks}
            transcript={clip.transcript}
            uri={clip.uri}
            autoPlayKey={
              clip.id === activeClip.id ? activeAutoPlayKey : undefined
            }
          />
        ))}
      </PressPropagationBoundary>
    );
  };

  AudioPlaylist.displayName = 'AudioPlaylist';
  return AudioPlaylist;
};
