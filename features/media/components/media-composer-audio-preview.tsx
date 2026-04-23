import { AudioPlayer } from '@/features/media/components/audio-player';
import { useAudioPlaylistPlayback } from '@/features/media/hooks/use-audio-playlist-playback';
import { useUiAudioPlaybackRate } from '@/features/media/hooks/use-ui-audio-playback-rate';
import type { Media } from '@/features/media/types/media';
import type * as mediaComposer from '@/features/media/types/media-composer.types';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { CaretLeft } from 'phosphor-react-native/lib/module/icons/CaretLeft';
import { CaretRight } from 'phosphor-react-native/lib/module/icons/CaretRight';
import { X } from 'phosphor-react-native/lib/module/icons/X';
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

export const MediaComposerAudioPreview = ({
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
    <View className="border-border-secondary shrink-0 border-t p-4">
      <View className="w-full flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          {items.map((previewItem, index) => {
            const isActive = index === activeIndex;

            return (
              <View
                className={cn('min-w-0 flex-1', !isActive && 'hidden')}
                key={previewItem.id}
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
                  />
                ) : (
                  <View className="bg-card flex-1 rounded-lg px-3 py-2">
                    <Text numberOfLines={1}>
                      {previewItem.item.fileName?.trim() || 'Audio file'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        {activeItem.type === 'media' ? (
          <Button
            className="ml-0.5 w-8 px-0"
            onPress={() => onDeleteMedia(activeItem.item.id)}
            size="xs"
            variant="ghost"
          >
            <Icon icon={X} />
          </Button>
        ) : (
          <View className="w-8 items-center justify-center">
            <Spinner className="scale-[0.8]" size="small" />
          </View>
        )}
        {hasMultipleItems && (
          <View className="shrink-0 flex-row items-center gap-1">
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
