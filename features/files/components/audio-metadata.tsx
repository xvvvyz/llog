import * as audioTransport from '@/features/files/components/audio-transport';
import * as mediaMetadataPrimitives from '@/features/files/components/media-metadata-primitives';
import { TrackMetadata } from '@/features/files/components/track-metadata';
import { TranscriptMetadata } from '@/features/files/components/transcript-metadata';
import * as audioMetadata from '@/features/files/lib/audio-metadata';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { SkipBack, SkipForward } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export {
  TrackArtwork,
  TrackLinksMenu,
  TrackText,
  type MediaMetadataPlaybackControls,
} from '@/features/files/components/media-metadata-primitives';

export {
  TrackMetadata,
  type TrackMetadataControls,
} from '@/features/files/components/track-metadata';

export {
  TranscriptMetadata,
  type TranscriptMetadataControls,
} from '@/features/files/components/transcript-metadata';

const SHEET_AUDIO_TRANSPORT_CLASS_NAME =
  'rounded-xl border border-border-secondary bg-secondary border-continuous';

const SHEET_AUDIO_TRANSPORT_BUTTON_CLASS_NAME = 'rounded-none';
const SHEET_AUDIO_TRANSPORT_BUTTON_WRAPPER_CLASS_NAME = 'rounded-none';

type AudioMetadataControls = audioTransport.AudioTransportControls & {
  currentTime: number;
  pause: () => void;
  playFrom: (seconds: number) => Promise<void>;
  seekTo: (seconds: number, resumePlayback?: boolean) => void;
};

const useAudioTrackNavigation = (
  tracks: readonly audioMetadata.AudioMetadataTrack[],
  controls: AudioMetadataControls
) => {
  const navigation = audioMetadata.getTrackNavigationState({
    currentTimeSeconds: controls.currentTime,
    pendingTimeSeconds: controls.pendingPlaybackTime,
    tracks,
  });

  const handlePrevious = () => {
    const target = tracks[navigation.previousIndex];
    if (!target) return;
    controls.seekTo(target.startSeconds, controls.isPlaying);
  };

  const handleNext = () => {
    const target = tracks[navigation.nextIndex];
    if (!target) return;
    controls.seekTo(target.startSeconds, controls.isPlaying);
  };

  return {
    canSeekNext: navigation.canSeekNext,
    canSeekPrevious: navigation.canSeekPrevious,
    currentIndex: navigation.currentIndex,
    currentTrack: navigation.currentTrack,
    handleNext,
    handlePrevious,
    pendingIndex: navigation.pendingIndex,
  };
};

export const AudioTrackSkipControls = ({
  buttonClassName = 'rounded-none',
  buttonWrapperClassName = 'rounded-none',
  controls,
  size = 'compact',
  tracks,
}: {
  buttonClassName?: string;
  buttonWrapperClassName?: string;
  controls: AudioMetadataControls;
  size?: 'compact' | 'default';
  tracks: readonly audioMetadata.AudioMetadataTrack[];
}) => {
  if (tracks.length <= 1) return null;
  const buttonSize = size === 'default' ? 'icon-sm' : 'icon-xs';
  const iconSize = size === 'default' ? 20 : 16;

  const {
    canSeekNext,
    canSeekPrevious,
    currentTrack,
    handleNext,
    handlePrevious,
  } = useAudioTrackNavigation(tracks, controls);

  if (!currentTrack) return null;

  return (
    <View className="flex-row items-center shrink-0">
      <Button
        accessibilityLabel="Previous track"
        className={buttonClassName}
        disabled={controls.isDisabled || !canSeekPrevious}
        onPress={handlePrevious}
        size={buttonSize}
        variant="ghost"
        wrapperClassName={buttonWrapperClassName}
      >
        <Icon
          className="text-muted-foreground"
          icon={SkipBack}
          size={iconSize}
        />
      </Button>
      <Button
        accessibilityLabel="Next track"
        className={buttonClassName}
        disabled={controls.isDisabled || !canSeekNext}
        onPress={handleNext}
        size={buttonSize}
        variant="ghost"
        wrapperClassName={buttonWrapperClassName}
      >
        <Icon
          className="text-muted-foreground"
          icon={SkipForward}
          size={iconSize}
        />
      </Button>
    </View>
  );
};

export const AudioTranscriptMetadata = ({
  className,
  controls,
  segments,
}: {
  className?: string;
  controls: AudioMetadataControls;
  segments: readonly audioMetadata.AudioTranscriptSegment[];
}) => {
  return (
    <View className={cn('min-w-0', className)}>
      <TranscriptMetadata
        controls={controls}
        portalNamePrefix="audio-transcript"
        segments={segments}
        renderFooter={({ closeSheet }) => (
          <React.Fragment>
            <audioTransport.AudioTransport
              className={SHEET_AUDIO_TRANSPORT_CLASS_NAME}
              controlButtonClassName={SHEET_AUDIO_TRANSPORT_BUTTON_CLASS_NAME}
              controls={controls}
              size="default"
              controlButtonWrapperClassName={
                SHEET_AUDIO_TRANSPORT_BUTTON_WRAPPER_CLASS_NAME
              }
            />
            <Button
              onPress={closeSheet}
              size="sm"
              variant="secondary"
              wrapperClassName="w-full"
            >
              <Text>Close</Text>
            </Button>
          </React.Fragment>
        )}
        renderTrigger={({ openSheet, previewSegment }) =>
          previewSegment ? (
            <Pressable
              accessibilityRole="button"
              className="min-w-0 w-full px-3 py-2"
              onPress={openSheet}
            >
              <Text
                className="min-w-0 w-full font-normal leading-snug text-left text-sm web:text-pretty"
                numberOfLines={1}
              >
                {previewSegment.text}
              </Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
};

export const AudioTracksMetadata = ({
  className,
  controls,
  tracks,
}: {
  className?: string;
  controls: AudioMetadataControls;
  tracks: readonly audioMetadata.AudioMetadataTrack[];
}) => {
  const sheetTransportTrailingAccessory = (
    <AudioTrackSkipControls
      buttonClassName={SHEET_AUDIO_TRANSPORT_BUTTON_CLASS_NAME}
      buttonWrapperClassName={SHEET_AUDIO_TRANSPORT_BUTTON_WRAPPER_CLASS_NAME}
      controls={controls}
      size="default"
      tracks={tracks}
    />
  );

  return (
    <View className={cn('min-w-0', className)}>
      <TrackMetadata
        controls={controls}
        portalNamePrefix="audio-tracks"
        tracks={tracks}
        renderFooter={({ closeSheet }) => (
          <React.Fragment>
            <audioTransport.AudioTransport
              className={SHEET_AUDIO_TRANSPORT_CLASS_NAME}
              controlButtonClassName={SHEET_AUDIO_TRANSPORT_BUTTON_CLASS_NAME}
              controls={controls}
              size="default"
              trailingAccessory={sheetTransportTrailingAccessory}
              controlButtonWrapperClassName={
                SHEET_AUDIO_TRANSPORT_BUTTON_WRAPPER_CLASS_NAME
              }
            />
            <Button
              onPress={closeSheet}
              size="sm"
              variant="secondary"
              wrapperClassName="w-full"
            >
              <Text>Close</Text>
            </Button>
          </React.Fragment>
        )}
        renderTrigger={({ currentTrack, openSheet }) => (
          <View className="flex-row min-w-0 pl-2 pr-3 py-2 gap-3 items-center">
            <Button
              className="flex-1 flex-row min-w-0 gap-3 group justify-start"
              onPress={openSheet}
              variant="link"
              wrapperClassName="flex-1 overflow-visible rounded-lg"
            >
              <View className="relative">
                <mediaMetadataPrimitives.TrackArtwork
                  className="overflow-hidden border-continuous rounded-md"
                  size={40}
                  track={currentTrack}
                />
              </View>
              <mediaMetadataPrimitives.TrackText track={currentTrack} />
            </Button>
            <View className="flex-row items-center shrink-0">
              <mediaMetadataPrimitives.TrackLinksMenu track={currentTrack} />
            </View>
          </View>
        )}
      />
    </View>
  );
};
