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
  analysisActionsDisabled?: boolean;
  canAnalyzeAudio?: boolean;
  className?: string;
  clips: audioPlayerTypes.AudioClip[];
};

export const createAudioPlaylist = (AudioPlayer: AudioPlayerComponent) => {
  const AudioPlaylist = ({
    analysisActionsDisabled,
    canAnalyzeAudio,
    className,
    clips,
  }: AudioPlaylistProps) => {
    const {
      activeAutoPlayKey,
      activeIndex,
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

    if (clips.length === 0) return null;
    const hasMultipleClips = clips.length > 1;

    return (
      <PressPropagationBoundary className={cn('min-w-0 gap-2', className)}>
        {clips.map((clip, index) => {
          const isActive = index === activeIndex;

          return (
            <AudioPlayer
              key={`${clip.id}:${index}`}
              analysisActionsDisabled={analysisActionsDisabled}
              assetKey={clip.assetKey}
              autoPlayKey={isActive ? activeAutoPlayKey : undefined}
              canAnalyzeAudio={canAnalyzeAudio}
              durationSeconds={durationMsToSeconds(clip.duration)}
              fileId={clip.id}
              identificationRequestedAt={clip.identificationRequestedAt}
              isIdentifying={clip.isIdentifying}
              isTranscribing={clip.isTranscribing}
              name={clip.name}
              onDidFinish={isActive ? () => handleDidFinish(index) : undefined}
              onNextClip={hasMultipleClips ? showNext : undefined}
              onPause={isActive ? handlePause : undefined}
              onPlaybackRateChange={setPlaybackRate}
              onPlayStart={() => handlePlayStart(index)}
              onPreviousClip={hasMultipleClips ? showPrevious : undefined}
              playbackRate={playbackRate}
              size={clip.size}
              tracks={clip.tracks}
              transcript={clip.transcript}
              transcriptionRequestedAt={clip.transcriptionRequestedAt}
              type={clip.type}
              uri={clip.uri}
            />
          );
        })}
      </PressPropagationBoundary>
    );
  };

  AudioPlaylist.displayName = 'AudioPlaylist';
  return AudioPlaylist;
};
