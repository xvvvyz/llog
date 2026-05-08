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
  canAnalyzeAudio?: boolean;
  className?: string;
  clips: audioPlayerTypes.AudioClip[];
};

export const createAudioPlaylist = (AudioPlayer: AudioPlayerComponent) => {
  const AudioPlaylist = ({
    canAnalyzeAudio,
    className,
    clips,
  }: AudioPlaylistProps) => {
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
            canAnalyzeAudio={canAnalyzeAudio}
            durationSeconds={durationMsToSeconds(clip.duration)}
            fileId={clip.id}
            isIdentifying={clip.isIdentifying}
            isTranscribing={clip.isTranscribing}
            name={clip.name}
            onDidFinish={() => handleDidFinish(index)}
            onNextClip={clips.length > 1 ? showNext : undefined}
            onPause={handlePause}
            onPlaybackRateChange={setPlaybackRate}
            onPlayStart={() => handlePlayStart(index)}
            onPreviousClip={clips.length > 1 ? showPrevious : undefined}
            playbackRate={playbackRate}
            size={clip.size}
            tracks={clip.tracks}
            transcript={clip.transcript}
            type={clip.type}
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
