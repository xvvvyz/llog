import { AudioPlayer } from '@/features/files/components/audio-player';
import { useAudioPlaylistPlayback } from '@/features/files/hooks/use-audio-playlist-playback';
import { useUiAudioPlaybackRate } from '@/features/files/hooks/use-ui-audio-playback-rate';
import * as attachmentItems from '@/features/files/lib/attachment-items';
import type * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import { useShowOfflineUi } from '@/features/offline/offline-ui-state';
import { cn } from '@/lib/cn';
import { durationMsToSeconds } from '@/lib/duration';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { CaretLeft, CaretRight, X } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

const PendingAudioPreview = ({
  actionsDisabled,
  active,
  autoPlayKey,
  hasMultipleItems,
  item,
  onDidFinish,
  onDeleteFile,
  onNextClip,
  onPause,
  onPlayStart,
  onPreviousClip,
}: {
  actionsDisabled?: boolean;
  active: boolean;
  autoPlayKey?: number;
  hasMultipleItems: boolean;
  item: fileComposer.PendingAudioUpload;
  onDidFinish?: () => void;
  onDeleteFile: (fileId: string) => void;
  onNextClip?: () => void;
  onPause?: () => void;
  onPlayStart?: () => void;
  onPreviousClip?: () => void;
}) => {
  const trailingAccessory = (
    <View className="flex-row items-center shrink-0">
      {item.status === 'uploading' ? (
        <View className="h-8 w-8 items-center justify-center">
          <Spinner size="xs" />
        </View>
      ) : (
        <Button
          className="rounded-none"
          disabled={actionsDisabled}
          onPress={() => onDeleteFile(item.id)}
          size="icon-xs"
          variant="ghost"
          wrapperClassName="rounded-none"
        >
          <Icon icon={X} />
        </Button>
      )}
    </View>
  );

  return (
    <AudioPlayer
      active={active}
      autoPlayKey={autoPlayKey}
      disabled={actionsDisabled}
      durationSeconds={durationMsToSeconds(item.duration)}
      fileId={item.id}
      onDidFinish={onDidFinish}
      onNextClip={hasMultipleItems ? onNextClip : undefined}
      onPause={onPause}
      onPlayStart={onPlayStart}
      onPreviousClip={hasMultipleItems ? onPreviousClip : undefined}
      showMetadata={false}
      showPlaybackRate={false}
      size={item.size}
      trailingAccessory={trailingAccessory}
      uri={item.uri}
    />
  );
};

export const AudioPreview = ({
  actionsDisabled,
  audioMedia,
  focusedAudioId,
  onFocusedAudioApplied,
  onDeleteFile,
  pendingAudio,
}: {
  actionsDisabled?: boolean;
  audioMedia: FileItem[];
  focusedAudioId?: string | null;
  onFocusedAudioApplied?: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  pendingAudio: fileComposer.PendingAudioUpload[];
}) => {
  const showOfflineUi = useShowOfflineUi();

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
  } = useAudioPlaylistPlayback(
    items,
    (item) => item.kind === 'file' || !!item.item.uri
  );

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
    <View className="shrink-0">
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
                    disabled={actionsDisabled}
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
                        disabled={actionsDisabled || showOfflineUi}
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
                  <PendingAudioPreview
                    actionsDisabled={actionsDisabled}
                    active={isActive}
                    autoPlayKey={isActive ? activeAutoPlayKey : undefined}
                    hasMultipleItems={hasMultipleItems}
                    item={previewItem.item}
                    onDeleteFile={onDeleteFile}
                    onDidFinish={isActive ? handleDidFinish : undefined}
                    onNextClip={isActive ? showNext : undefined}
                    onPause={isActive ? handlePause : undefined}
                    onPreviousClip={isActive ? showPrevious : undefined}
                    onPlayStart={
                      isActive ? () => handlePlayStart(index) : undefined
                    }
                  />
                )}
              </View>
            );
          })}
        </View>
        {hasMultipleItems && (
          <View className="flex-row -mr-1.5 ml-3 gap-1 items-center shrink-0">
            <Button
              accessibilityLabel="Previous audio"
              className="w-8 px-0"
              disabled={actionsDisabled}
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
              disabled={actionsDisabled}
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
