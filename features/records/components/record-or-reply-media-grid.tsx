import { useMediaLightbox } from '@/features/media/hooks/use-media-lightbox';
import * as media from '@/features/media/lib/media';
import { Media } from '@/features/media/types/media';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Play } from 'phosphor-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

export const RecordOrReplyMediaGrid = ({
  recordId,
  visualMedia,
}: {
  recordId?: string;
  visualMedia: Media[];
}) => {
  const timelineTargetWidth = media.getTimelineTargetWidth(visualMedia.length);
  const { openMediaLightbox } = useMediaLightbox({ recordId });

  const handlePress = React.useCallback(
    (mediaId: string) => {
      openMediaLightbox(mediaId);
    },
    [openMediaLightbox]
  );

  const renderMediaThumb = React.useCallback(
    (item: Media) => {
      const isProcessing = media.isVideoMediaProcessing(item);

      return (
        <Pressable
          key={item.id}
          className="flex-1"
          disabled={isProcessing || !recordId}
          onPress={() => handlePress(item.id)}
        >
          <Image
            fill
            targetWidth={timelineTargetWidth}
            uri={media.getVisualMediaThumbnailUri(item)}
            wrapperClassName="rounded-2xl"
          />
          {item.type === 'video' && (
            <View className="absolute inset-0 pointer-events-none items-center justify-center">
              {isProcessing ? (
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
    },
    [handlePress, timelineTargetWidth]
  );

  if (!visualMedia.length) return null;

  return (
    <View className="aspect-[3/2] gap-0.5">
      <View className="flex-1 flex-row gap-0.5">
        {visualMedia.slice(0, 3).map(renderMediaThumb)}
      </View>
      {visualMedia.length > 3 && (
        <View className="flex-1 flex-row gap-0.5">
          {visualMedia.slice(3, 6).map(renderMediaThumb)}
        </View>
      )}
    </View>
  );
};
