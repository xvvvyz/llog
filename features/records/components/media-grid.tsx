import { PendingVideoPreview } from '@/features/files/components/composer/pending-video-preview';
import { useMediaLightbox } from '@/features/files/hooks/use-lightbox';
import { isFileAvailableOffline } from '@/features/files/lib/offline-availability';
import * as visualMedia from '@/features/files/lib/visual-media';
import { FileItem } from '@/features/files/types/file';
import { useConnectivity } from '@/features/offline/connectivity';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { Play, WifiSlash } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

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

  const connectivity = useConnectivity();
  const { openMediaLightbox } = useMediaLightbox({ recordId });

  const handlePress = React.useCallback(
    (fileId: string) => {
      openMediaLightbox(fileId);
    },
    [openMediaLightbox]
  );

  const renderMediaThumb = React.useCallback(
    (item: FileItem) => {
      const isLocalVideo =
        item.type === 'video' &&
        !item.assetKey &&
        !!item.uri &&
        /^(blob|content|data|file):/i.test(item.uri);

      const isProcessing = visualMedia.isProcessing(item) && !isLocalVideo;
      const isAvailableOffline = isFileAvailableOffline(item);

      const isUnavailableOffline =
        connectivity.isOffline && !isAvailableOffline;

      const canOpenMedia =
        !!recordId &&
        !isProcessing &&
        (!connectivity.isOffline || isAvailableOffline);

      return (
        <Pressable
          key={item.id}
          className="flex-1"
          disabled={!canOpenMedia}
          onPress={() => {
            if (canOpenMedia) handlePress(item.id);
          }}
        >
          {isLocalVideo ? (
            <View className="overflow-hidden h-full w-full border-continuous rounded-2xl">
              <PendingVideoPreview autoPlay uri={item.uri} />
            </View>
          ) : (
            <Image
              fill
              targetWidth={timelineTargetWidth}
              uri={visualMedia.getThumbnailUri(item)}
              wrapperClassName="rounded-2xl border-continuous"
            />
          )}
          {(item.type === 'video' || isUnavailableOffline) && (
            <View className="absolute inset-0 pointer-events-none items-center justify-center">
              {isUnavailableOffline ? (
                <View className="size-10 border-continuous rounded-full bg-background/50 items-center justify-center">
                  <Icon
                    className="text-muted-foreground"
                    icon={WifiSlash}
                    size={20}
                  />
                </View>
              ) : isProcessing ? (
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
    },
    [connectivity.isOffline, handlePress, recordId, timelineTargetWidth]
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
