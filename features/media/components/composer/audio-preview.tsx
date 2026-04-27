import { AudioPlayer } from '@/features/media/components/audio-player';
import { useAudioPlaylistPlayback } from '@/features/media/hooks/use-audio-playlist-playback';
import { useUiAudioPlaybackRate } from '@/features/media/hooks/use-ui-audio-playback-rate';
import type * as mediaComposer from '@/features/media/types/composer';
import type { Media } from '@/features/media/types/media';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { CaretLeft, CaretRight, X } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

type AudioPreviewItem =
  | { id: string; item: Media; order: number; type: 'media' }
  | {
      id: string;
      item: mediaComposer.PendingAudioUpload;
      order: number;
      type: 'pending';
    };

const isPlayableAudioPreviewItem = (item: AudioPreviewItem) =>
  item.type === 'media';

export const AudioPreview = ({
  audioMedia,
  onDeleteMedia,
  pendingAudio,
}: {
  audioMedia: Media[];
  onDeleteMedia: (mediaId: string) => void;
  pendingAudio: mediaComposer.PendingAudioUpload[];
}) => {
  const items = React.useMemo(
    () =>
      [
        ...audioMedia.map(
          (item): AudioPreviewItem => ({
            id: item.id,
            item,
            order: item.order ?? 0,
            type: 'media',
          })
        ),
        ...pendingAudio.map(
          (item): AudioPreviewItem => ({
            id: item.id,
            item,
            order: item.order,
            type: 'pending',
          })
        ),
      ].sort((a, b) => a.order - b.order),
    [audioMedia, pendingAudio]
  );

  const {
    activeAutoPlayKey,
    activeIndex,
    activeItem,
    handleDidFinish,
    handlePause,
    handlePlayStart,
    showNext,
    showPrevious,
  } = useAudioPlaylistPlayback(items, isPlayableAudioPreviewItem);

  const hasMultipleItems = items.length > 1;
  const countWidth = String(items.length).length * 14 + 26;
  const { audioPlaybackRate } = useUiAudioPlaybackRate();
  if (!activeItem) return null;

  return (
    <View className="px-4 shrink-0">
      <View className="flex-row min-w-0 items-center">
        <View className="flex-1 min-w-0">
          {items.map((previewItem, index) => {
            const isActive = index === activeIndex;

            return (
              <View
                key={previewItem.id}
                className={cn('min-w-0 flex-1', !isActive && 'hidden')}
              >
                {previewItem.type === 'media' ? (
                  <AudioPlayer
                    active={isActive}
                    autoPlayKey={isActive ? activeAutoPlayKey : undefined}
                    duration={previewItem.item.duration!}
                    onDidFinish={isActive ? handleDidFinish : undefined}
                    onPause={isActive ? handlePause : undefined}
                    onPlayStart={isActive ? handlePlayStart : undefined}
                    playbackRate={audioPlaybackRate}
                    showPlaybackRate={false}
                    uri={previewItem.item.uri}
                    trailingAccessory={
                      <Button
                        onPress={() => onDeleteMedia(previewItem.item.id)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Icon icon={X} />
                      </Button>
                    }
                  />
                ) : (
                  <View className="flex-1 h-8 px-3 rounded-lg bg-card justify-center">
                    <Text numberOfLines={1}>
                      {previewItem.item.name?.trim() || 'Audio'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        {activeItem.type === 'pending' && (
          <View className="w-8 items-center justify-center">
            <Spinner size="xs" />
          </View>
        )}
        {hasMultipleItems && (
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
              {activeIndex + 1} of {items.length}
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
    </View>
  );
};
