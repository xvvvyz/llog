import { PendingVideoPreview } from '@/features/files/components/composer/pending-video-preview';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import * as offlineAvailability from '@/features/files/lib/offline-availability';
import * as visualMedia from '@/features/files/lib/visual-media';
import { FileItem } from '@/features/files/types/file';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { Play } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

const MediaGridItem = ({
  item,
  onPress,
  recordId,
  timelineTargetWidth,
}: {
  item: FileItem;
  onPress: (fileId: string) => void;
  recordId?: string;
  timelineTargetWidth: number;
}) => {
  const thumbnailUri = visualMedia.getThumbnailUri(item);

  const cachedThumbnail = offlineAvailability.useCachedFileSource({
    enabled: true,
    options: { targetWidth: timelineTargetWidth },
    type: 'image',
    uri: thumbnailUri,
  });

  const isLocalVideo =
    item.type === 'video' &&
    !item.assetKey &&
    !!item.uri &&
    offlineAvailability.isLocalFileSourceUri(item.uri);

  const isProcessing = visualMedia.isProcessing(item) && !isLocalVideo;
  const canOpenMedia = !!recordId && !isProcessing;

  return (
    <Pressable
      className="flex-1"
      disabled={!canOpenMedia}
      onPress={() => {
        if (canOpenMedia) onPress(item.id);
      }}
    >
      {isLocalVideo ? (
        <View className="overflow-hidden h-full w-full border-continuous rounded-2xl">
          <PendingVideoPreview autoPlay uri={item.uri} />
        </View>
      ) : (
        <Image
          fill
          src={cachedThumbnail.src}
          targetWidth={timelineTargetWidth}
          uri={thumbnailUri}
          wrapperClassName="rounded-2xl border-continuous"
        />
      )}
      {item.type === 'video' && (
        <View className="absolute inset-0 pointer-events-none items-center justify-center">
          {isProcessing ? (
            <Spinner />
          ) : (
            <View className="size-10 border-continuous rounded-full bg-background/50 items-center justify-center">
              <Icon
                className="text-foreground"
                icon={Play}
                size={20}
                weight="fill"
              />
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
};

export const MediaGrid = ({
  recordId,
  visualMedia: visualItems,
}: {
  recordId?: string;
  visualMedia: FileItem[];
}) => {
  const timelineTargetWidth = visualMedia.getThumbnailTargetWidth(
    visualItems.length
  );

  const { openMediaLightbox } = useMediaLightbox({ recordId });

  const renderMediaThumb = React.useCallback(
    (item: FileItem) => (
      <MediaGridItem
        key={item.id}
        item={item}
        onPress={openMediaLightbox}
        recordId={recordId}
        timelineTargetWidth={timelineTargetWidth}
      />
    ),
    [openMediaLightbox, recordId, timelineTargetWidth]
  );

  if (!visualItems.length) return null;

  return (
    <View className="aspect-[3/2] gap-0.5">
      <View className="flex-1 flex-row gap-0.5">
        {visualItems.slice(0, 3).map(renderMediaThumb)}
      </View>
      {visualItems.length > 3 && (
        <View className="flex-1 flex-row gap-0.5">
          {visualItems.slice(3, 6).map(renderMediaThumb)}
        </View>
      )}
    </View>
  );
};
