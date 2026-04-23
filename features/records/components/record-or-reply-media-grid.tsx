import { useMediaLightbox } from '@/features/media/hooks/use-media-lightbox';
import * as media from '@/features/media/lib/media';
import { Media } from '@/features/media/types/media';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

export const RecordOrReplyMediaGrid = ({
  visualMedia,
}: {
  visualMedia: Media[];
}) => {
  const timelineTargetWidth = media.getTimelineTargetWidth(visualMedia.length);

  const { mediaLightbox, openMediaLightbox } = useMediaLightbox({
    media: visualMedia,
  });

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
          className="flex-1"
          disabled={isProcessing}
          key={item.id}
          onPress={() => handlePress(item.id)}
        >
          <Image
            fill
            targetWidth={timelineTargetWidth}
            uri={media.getVisualMediaThumbnailUri(item)}
            wrapperClassName="rounded-2xl"
          />
          {item.type === 'video' && (
            <View className="pointer-events-none absolute inset-0 items-center justify-center">
              {isProcessing ? (
                <ActivityIndicator color={UI.light.contrastForeground} />
              ) : (
                <View className="bg-contrast-background/50 size-10 items-center justify-center rounded-full">
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
    <React.Fragment>
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
      {mediaLightbox}
    </React.Fragment>
  );
};
