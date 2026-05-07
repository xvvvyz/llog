import * as audioMetadata from '@/features/files/components/audio-metadata';
import { createAudioPlaylist } from '@/features/files/components/audio-playlist';
import { AudioTransport } from '@/features/files/components/audio-transport';
import * as audioMediaSession from '@/features/files/hooks/use-audio-media-session';
import { useAudioPlayerController } from '@/features/files/hooks/use-audio-player-controller';
import * as audioMetadataLib from '@/features/files/lib/audio-metadata';
import { DEFAULT_AUDIO_PLAYBACK_RATE } from '@/features/files/lib/audio-playback-rate';
import type { AudioPlayerProps } from '@/features/files/types/audio-player';
import { cn } from '@/lib/cn';
import * as React from 'react';
import { View } from 'react-native';

export const AudioPlayer = (props: AudioPlayerProps) => {
  const {
    fileId,
    name,
    onNextClip,
    onPreviousClip,
    showPlaybackRate = true,
    trailingAccessory,
  } = props;

  const tracks = React.useMemo(
    () => audioMetadataLib.parseAudioTracks(props.tracks, { fileId }),
    [fileId, props.tracks]
  );

  const transcript = React.useMemo(
    () => audioMetadataLib.parseTranscriptSegments(props.transcript),
    [props.transcript]
  );

  const hasTracks = tracks.length > 0;
  const hasMultipleTracks = tracks.length > 1;

  const controls = useAudioPlayerController(
    hasMultipleTracks
      ? {
          ...props,
          onPlaybackRateChange: undefined,
          playbackRate: DEFAULT_AUDIO_PLAYBACK_RATE,
        }
      : props
  );

  const trackNavigation = React.useMemo(
    () =>
      audioMetadataLib.getTrackNavigationState({
        currentTimeSeconds: controls.displayTime,
        tracks,
      }),
    [controls.displayTime, tracks]
  );

  const currentTrackIndex = trackNavigation.currentIndex;
  const currentTrack = trackNavigation.currentTrack;

  const mediaSessionMetadata = React.useMemo(() => {
    if (currentTrack) {
      return audioMetadataLib.getTrackMediaSessionMetadata(currentTrack);
    }

    const title = name?.trim() || 'Audio';
    return { artist: 'llog', title };
  }, [currentTrack, name]);

  const adjacentTrackMetadata = React.useMemo(() => {
    if (!hasTracks) return [];

    return [currentTrackIndex - 1, currentTrackIndex, currentTrackIndex + 1]
      .flatMap((index) => {
        const track = tracks[index];

        return track
          ? [audioMetadataLib.getTrackMediaSessionMetadata(track)]
          : [];
      })
      .filter((metadata) => !!metadata.artwork?.length);
  }, [currentTrackIndex, hasTracks, tracks]);

  React.useEffect(() => {
    for (const metadata of adjacentTrackMetadata) {
      void audioMediaSession.preloadAudioMediaSessionArtwork(metadata);
    }
  }, [adjacentTrackMetadata]);

  const handleMediaSessionPrevious = React.useCallback(() => {
    if (!currentTrack) {
      onPreviousClip?.();
      return;
    }

    const targetTrack = tracks[trackNavigation.previousIndex];

    if (targetTrack) {
      controls.seekTo(targetTrack.startSeconds, controls.isPlaying);
      return;
    }

    onPreviousClip?.();
  }, [
    controls.displayTime,
    controls.isPlaying,
    controls.seekTo,
    currentTrack,
    onPreviousClip,
    trackNavigation.previousIndex,
    tracks,
  ]);

  const handleMediaSessionNext = React.useCallback(() => {
    const targetTrack = tracks[trackNavigation.nextIndex];

    if (targetTrack) {
      controls.seekTo(targetTrack.startSeconds, controls.isPlaying);
      return;
    }

    onNextClip?.();
  }, [
    controls.isPlaying,
    controls.seekTo,
    onNextClip,
    trackNavigation.nextIndex,
    tracks,
  ]);

  const hasMediaSessionPrevious =
    trackNavigation.canSeekPrevious || onPreviousClip != null;

  const hasMediaSessionNext = trackNavigation.canSeekNext || onNextClip != null;

  audioMediaSession.useAudioMediaSession({
    currentTime: controls.displayTime,
    disabled: controls.isDisabled,
    duration: controls.playerDuration,
    isPlaying: controls.isPlaying,
    metadata: mediaSessionMetadata,
    onNextTrack: hasMediaSessionNext ? handleMediaSessionNext : undefined,
    onPause: controls.pause,
    onPlay: controls.play,
    onPreviousTrack: hasMediaSessionPrevious
      ? handleMediaSessionPrevious
      : undefined,
    onSeekBackward: (seconds) => controls.seekBy(-seconds),
    onSeekForward: controls.seekBy,
    onSeekTo: (seconds) => controls.seekTo(seconds, controls.isPlaying),
    playbackRate: controls.currentPlaybackRate,
  });

  const trackControls = { ...controls, currentTime: controls.displayTime };

  const trackMetadata = hasTracks ? (
    <audioMetadata.AudioTracksMetadata
      className="border-b border-border-secondary border-continuous"
      controls={trackControls}
      tracks={tracks}
    />
  ) : null;

  const transcriptMetadata =
    transcript.length > 0 ? (
      <audioMetadata.AudioTranscriptMetadata
        className="border-b border-border-secondary border-continuous"
        controls={trackControls}
        segments={transcript}
      />
    ) : null;

  const metadata =
    trackMetadata || transcriptMetadata ? (
      <React.Fragment>
        {trackMetadata}
        {transcriptMetadata}
      </React.Fragment>
    ) : null;

  const hasMetadata = metadata != null;

  const trackSkipControls = hasMultipleTracks ? (
    <audioMetadata.AudioTrackSkipControls
      controls={trackControls}
      tracks={tracks}
    />
  ) : null;

  const transportTrailingAccessory =
    hasMultipleTracks && trailingAccessory ? (
      <View className="flex-row items-center shrink-0">
        {trackSkipControls}
        {trailingAccessory}
      </View>
    ) : hasMultipleTracks ? (
      trackSkipControls
    ) : (
      trailingAccessory
    );

  return (
    <View
      className={cn(
        'min-w-0',
        hasMetadata &&
          'overflow-hidden rounded-lg border border-border-secondary bg-secondary border-continuous'
      )}
    >
      {metadata}
      <AudioTransport
        controls={controls}
        showPlaybackRate={!hasMultipleTracks && showPlaybackRate}
        trailingAccessory={transportTrailingAccessory}
        className={cn(
          !hasMetadata &&
            'rounded-lg border border-border-secondary bg-secondary border-continuous'
        )}
      />
    </View>
  );
};

export const AudioPlaylist = createAudioPlaylist(AudioPlayer);
