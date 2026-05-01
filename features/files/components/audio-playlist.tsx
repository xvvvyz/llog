import { useAudioPlaylistPlayback } from '@/features/files/hooks/use-audio-playlist-playback';
import { useUiAudioPlaybackRate } from '@/features/files/hooks/use-ui-audio-playback-rate';
import type * as audioPlayerTypes from '@/features/files/types/audio-player';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { PressPropagationBoundary } from '@/ui/press-propagation-boundary';
import { Text } from '@/ui/text';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

type AudioPlayerComponent =
  React.ComponentType<audioPlayerTypes.AudioPlayerProps>;

type AudioPlaylistLayout = 'paged' | 'stacked';

type AudioPlaylistProps = {
  className?: string;
  clips: audioPlayerTypes.AudioClip[];
  compact?: boolean;
  layout?: AudioPlaylistLayout;
  showPlaybackRate?: boolean;
};

export const createAudioPlaylist = (AudioPlayer: AudioPlayerComponent) => {
  const AudioPlaylist = ({
    className,
    clips,
    compact,
    layout = 'paged',
    showPlaybackRate = true,
  }: AudioPlaylistProps) => {
    const {
      activeAutoPlayKey,
      activeIndex,
      activeItem: activeClip,
      handleDidFinish,
      handlePause,
      handlePlayStart,
      showNext,
      showPrevious,
    } = useAudioPlaylistPlayback(clips);

    const hasMultipleClips = clips.length > 1;
    const countWidth = String(clips.length).length * 14 + 26;

    const {
      audioPlaybackRate: playbackRate,
      setAudioPlaybackRate: setPlaybackRate,
    } = useUiAudioPlaybackRate();

    if (!activeClip) return null;

    if (layout === 'stacked') {
      return (
        <PressPropagationBoundary className={cn('min-w-0 gap-2', className)}>
          {clips.map((clip, index) => (
            <AudioPlayer
              key={clip.id}
              compact={compact}
              duration={clip.duration}
              onDidFinish={() => handleDidFinish(index)}
              onPause={handlePause}
              onPlaybackRateChange={setPlaybackRate}
              onPlayStart={handlePlayStart}
              playbackRate={playbackRate}
              showPlaybackRate={showPlaybackRate}
              uri={clip.uri}
              autoPlayKey={
                clip.id === activeClip.id ? activeAutoPlayKey : undefined
              }
            />
          ))}
        </PressPropagationBoundary>
      );
    }

    return (
      <PressPropagationBoundary
        className={cn('min-w-0 flex-row items-center', className)}
      >
        <View className="flex-1 min-w-0">
          {clips.map((clip, index) => {
            const isActive = index === activeIndex;

            return (
              <View
                key={clip.id}
                className={cn('min-w-0 flex-1', !isActive && 'hidden')}
              >
                <AudioPlayer
                  active={isActive}
                  autoPlayKey={isActive ? activeAutoPlayKey : undefined}
                  compact={compact}
                  duration={clip.duration}
                  onDidFinish={isActive ? handleDidFinish : undefined}
                  onPause={isActive ? handlePause : undefined}
                  onPlaybackRateChange={setPlaybackRate}
                  onPlayStart={isActive ? handlePlayStart : undefined}
                  playbackRate={playbackRate}
                  showPlaybackRate={showPlaybackRate}
                  uri={clip.uri}
                />
              </View>
            );
          })}
        </View>
        {hasMultipleClips && (
          <View className="flex-row -mr-1.5 ml-4 gap-1 items-center shrink-0">
            <Button
              accessibilityLabel="Previous audio"
              className="w-8 px-0"
              onPress={showPrevious}
              size="xs"
              variant="ghost"
            >
              <Icon icon={CaretLeft} />
            </Button>
            <Text
              className="text-center text-placeholder text-xs"
              numberOfLines={1}
              style={{ width: countWidth }}
            >
              {activeIndex + 1} of {clips.length}
            </Text>
            <Button
              accessibilityLabel="Next audio"
              className="w-8 px-0"
              onPress={showNext}
              size="xs"
              variant="ghost"
            >
              <Icon icon={CaretRight} />
            </Button>
          </View>
        )}
      </PressPropagationBoundary>
    );
  };

  AudioPlaylist.displayName = 'AudioPlaylist';
  return AudioPlaylist;
};
