import { LocalVideoPreview } from '@/features/files/components/local-video-preview';
import { UploadProgressOverlay } from '@/features/files/components/upload-progress-overlay';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import * as offlineAvailability from '@/features/files/lib/offline-availability';
import * as visualMedia from '@/features/files/lib/visual-media';
import { useQueuedAttachmentStatus } from '@/features/offline/outbox-hooks';
import { FileItem } from '@/features/files/types/file';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
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

  const queuedStatus = useQueuedAttachmentStatus(item.id);
  const isProcessing = visualMedia.isProcessing(item);

  // A pending video keeps its local uri as the thumbnail, which an <Image>
  // can't paint; show the local source and the upload indicator instead.
  const isUploadPending =
    isProcessing || (queuedStatus != null && queuedStatus !== 'error');

  const showLocalPreview =
    item.type === 'video' &&
    isUploadPending &&
    visualMedia.isLocalPreviewableUri(item.uri);

  // Openable even while uploading/processing — the carousel shows the local
  // preview and progress for pending media.
  const canOpenMedia = !!recordId;

  return (
    <Pressable
      className="flex-1 overflow-hidden rounded-2xl"
      disabled={!canOpenMedia}
      onPress={() => {
        if (canOpenMedia) onPress(item.id);
      }}
    >
      {showLocalPreview ? (
        <View className="absolute inset-0 overflow-hidden border-continuous rounded-2xl bg-border">
          <LocalVideoPreview contentFit="cover" uri={item.uri} />
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
      {item.type === 'video' ? (
        isUploadPending ? (
          <UploadProgressOverlay
            barLayout="spinner"
            fileId={item.id}
            isProcessing
            isVideo
          />
        ) : (
          <View className="absolute inset-0 pointer-events-none items-center justify-center">
            <View className="size-10 border-continuous rounded-full bg-background/50 items-center justify-center">
              <Icon
                className="text-foreground"
                icon={Play}
                size={20}
                weight="fill"
              />
            </View>
          </View>
        )
      ) : (
        isUploadPending && (
          <UploadProgressOverlay
            barLayout="spinner"
            fileId={item.id}
            isVideo={false}
          />
        )
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
