import { AudioPlaylist } from '@/features/media/components/audio-player';
import { DocumentAttachments } from '@/features/media/components/document-attachments';
import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { useMediaLightbox } from '@/features/media/hooks/use-lightbox';
import * as visualMedia from '@/features/media/lib/visual-media';
import { Media } from '@/features/media/types/media';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Play } from 'phosphor-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

export const ItemMedia = ({
  media,
  recordId,
}: {
  media?: Media[];
  recordId?: string;
}) => {
  const {
    audioMedia,
    documentMedia,
    visualMedia: visualItems,
  } = useFilteredMedia(media || []);

  const { openMediaLightbox } = useMediaLightbox({ recordId });

  if (!visualItems.length && !audioMedia.length && !documentMedia.length) {
    return null;
  }

  const timelineTargetWidth = visualMedia.getThumbnailTargetWidth(
    visualItems.length
  );

  const renderMediaThumb = (item: Media) => (
    <Pressable
      key={item.id}
      className="flex-1"
      disabled={visualMedia.isProcessing(item) || !recordId}
      onPress={() =>
        !visualMedia.isProcessing(item) && openMediaLightbox(item.id)
      }
    >
      <Image
        fill
        targetWidth={timelineTargetWidth}
        uri={visualMedia.getThumbnailUri(item)}
        wrapperClassName="rounded-2xl"
      />
      {item.type === 'video' && (
        <View className="absolute inset-0 pointer-events-none items-center justify-center">
          {visualMedia.isProcessing(item) ? (
            <ActivityIndicator color={UI.light.contrastForeground} />
          ) : (
            <View className="size-10 rounded-full bg-contrast-background/50 items-center justify-center">
              <Icon
                className="text-contrast-foreground"
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

  return (
    <React.Fragment>
      {!!visualItems.length && (
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
      )}
      {audioMedia.length > 0 && (
        <View className="px-4 gap-2">
          <AudioPlaylist clips={audioMedia} />
        </View>
      )}
      {documentMedia.length > 0 && (
        <DocumentAttachments
          documents={documentMedia}
          triggerClassName="px-4"
          triggerIconClassName="-ml-px"
        />
      )}
    </React.Fragment>
  );
};
