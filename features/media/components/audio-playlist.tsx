import { useAudioPlaylistPlayback } from '@/features/media/hooks/use-audio-playlist-playback';
import { useUiAudioPlaybackRate } from '@/features/media/hooks/use-ui-audio-playback-rate';
import type * as audioPlayerTypes from '@/features/media/types/audio-player.types';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { CaretLeft } from 'phosphor-react-native/lib/module/icons/CaretLeft';
import { CaretRight } from 'phosphor-react-native/lib/module/icons/CaretRight';
import * as React from 'react';
import { View } from 'react-native';

type AudioPlayerComponent =
  React.ComponentType<audioPlayerTypes.AudioPlayerProps>;

export const createAudioPlaylist = (AudioPlayer: AudioPlayerComponent) => {
  const AudioPlaylist = ({
    className,
    clips,
    compact,
    showPlaybackRate = true,
  }: {
    className?: string;
    clips: audioPlayerTypes.AudioClip[];
    compact?: boolean;
    showPlaybackRate?: boolean;
  }) => {
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

    return (
      <View className={cn('min-w-0 flex-row items-center', className)}>
        <View className="min-w-0 flex-1">
          {clips.map((clip, index) => {
            const isActive = index === activeIndex;

            return (
              <View
                className={cn('min-w-0 flex-1', !isActive && 'hidden')}
                key={clip.id}
              >
                <AudioPlayer
                  active={isActive}
                  autoPlayKey={isActive ? activeAutoPlayKey : undefined}
                  compact={compact}
                  duration={clip.duration}
                  onDidFinish={isActive ? handleDidFinish : undefined}
                  onPause={isActive ? handlePause : undefined}
                  onPlayStart={isActive ? handlePlayStart : undefined}
                  onPlaybackRateChange={setPlaybackRate}
                  playbackRate={playbackRate}
                  showPlaybackRate={showPlaybackRate}
                  uri={clip.uri}
                />
              </View>
            );
          })}
        </View>
        {hasMultipleClips && (
          <View className="ml-3 shrink-0 flex-row items-center gap-1">
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
              className="text-muted-foreground text-center text-xs"
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
      </View>
    );
  };

  AudioPlaylist.displayName = 'AudioPlaylist';

  return AudioPlaylist;
};
