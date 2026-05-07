import { AudioPlayer } from '@/features/files/components/audio-player';
import { useAudioPlaylistPlayback } from '@/features/files/hooks/use-audio-playlist-playback';
import { useUiAudioPlaybackRate } from '@/features/files/hooks/use-ui-audio-playback-rate';
import * as attachmentItems from '@/features/files/lib/attachment-items';
import { formatFileSize } from '@/features/files/lib/file-size';
import { getFileTypeIcon } from '@/features/files/lib/file-type-icon';
import type * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import { cn } from '@/lib/cn';
import { durationMsToSeconds } from '@/lib/duration';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { CaretLeft, CaretRight, X } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

type AudioPreviewItem = attachmentItems.AttachmentPreviewItem<
  FileItem,
  fileComposer.PendingAudioUpload
>;

const getAudioName = (item: { name?: string | null }) =>
  item.name?.trim() || 'Audio';

const getAudioSizeText = (item: { size?: number | null }) =>
  formatFileSize(item.size) || 'Uploading';

const PendingAudioPreview = ({
  item,
}: {
  item: fileComposer.PendingAudioUpload;
}) => {
  const AudioIcon = getFileTypeIcon(item);

  return (
    <View className="flex-1 flex-row overflow-hidden h-8 max-h-8 min-h-8 min-w-0 px-1 border-border-secondary border-continuous rounded-lg bg-secondary opacity-70 border gap-1 items-center">
      <View className="size-6 items-center justify-center shrink-0">
        <Icon className="text-placeholder" icon={AudioIcon} size={16} />
      </View>
      <View className="flex-1 flex-row min-w-0 gap-4 items-baseline justify-between">
        <Text
          className="flex-1 min-w-0 text-muted-foreground text-sm"
          numberOfLines={1}
        >
          {getAudioName(item)}
        </Text>
        <Text className="text-placeholder text-xs shrink-0" numberOfLines={1}>
          {getAudioSizeText(item)}
        </Text>
      </View>
      <View className="ml-0.5 size-6 items-center justify-center shrink-0">
        <Spinner size="xs" />
      </View>
    </View>
  );
};

export const AudioPreview = ({
  audioMedia,
  focusedAudioId,
  onFocusedAudioApplied,
  onDeleteFile,
  pendingAudio,
}: {
  audioMedia: FileItem[];
  focusedAudioId?: string | null;
  onFocusedAudioApplied?: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  pendingAudio: fileComposer.PendingAudioUpload[];
}) => {
  const items = React.useMemo(
    () =>
      attachmentItems.getAttachmentPreviewItems({
        files: audioMedia,
        pending: pendingAudio,
      }),
    [audioMedia, pendingAudio]
  );

  const itemIds = React.useMemo(() => items.map((item) => item.id), [items]);
  const previousItemIdsRef = React.useRef<string[] | null>(null);

  const {
    activeAutoPlayKey,
    activeIndex,
    activeItem,
    handleDidFinish,
    handlePause,
    handlePlayStart,
    setActiveIndex,
    showNext,
    showPrevious,
  } = useAudioPlaylistPlayback(items, (item) => item.kind === 'file');

  React.useEffect(() => {
    const previousItemIds = previousItemIdsRef.current;
    previousItemIdsRef.current = itemIds;
    if (!previousItemIds) return;
    const previousIdSet = new Set(previousItemIds);

    for (let index = itemIds.length - 1; index >= 0; index -= 1) {
      if (previousIdSet.has(itemIds[index])) continue;
      setActiveIndex(index);
      return;
    }
  }, [itemIds, setActiveIndex]);

  React.useEffect(() => {
    if (!focusedAudioId) return;
    const focusedIndex = itemIds.indexOf(focusedAudioId);
    if (focusedIndex === -1) return;
    setActiveIndex(focusedIndex);
    onFocusedAudioApplied?.(focusedAudioId);
  }, [focusedAudioId, itemIds, onFocusedAudioApplied, setActiveIndex]);

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
                {previewItem.kind === 'file' ? (
                  <AudioPlayer
                    active={isActive}
                    assetKey={previewItem.item.assetKey}
                    autoPlayKey={isActive ? activeAutoPlayKey : undefined}
                    fileId={previewItem.item.id}
                    name={previewItem.item.name}
                    onDidFinish={isActive ? handleDidFinish : undefined}
                    onPause={isActive ? handlePause : undefined}
                    playbackRate={audioPlaybackRate}
                    showMetadata={false}
                    showPlaybackRate={false}
                    transcript={previewItem.item.transcript}
                    uri={previewItem.item.uri}
                    durationSeconds={durationMsToSeconds(
                      previewItem.item.duration
                    )}
                    onNextClip={
                      isActive && hasMultipleItems ? showNext : undefined
                    }
                    onPlayStart={
                      isActive ? () => handlePlayStart(index) : undefined
                    }
                    onPreviousClip={
                      isActive && hasMultipleItems ? showPrevious : undefined
                    }
                    trailingAccessory={
                      <Button
                        className="rounded-none"
                        onPress={() => onDeleteFile(previewItem.item.id)}
                        size="icon-xs"
                        variant="ghost"
                        wrapperClassName="rounded-none"
                      >
                        <Icon icon={X} />
                      </Button>
                    }
                  />
                ) : (
                  <PendingAudioPreview item={previewItem.item} />
                )}
              </View>
            );
          })}
        </View>
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
