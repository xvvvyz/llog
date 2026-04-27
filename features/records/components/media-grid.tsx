import { useMediaLightbox } from '@/features/media/hooks/use-lightbox';
import * as visualMedia from '@/features/media/lib/visual-media';
import { Media } from '@/features/media/types/media';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { Play } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export const MediaGrid = ({
  recordId,
  visualMedia: visualItems,
}: {
  recordId?: string;
  visualMedia: Media[];
}) => {
  const timelineTargetWidth = visualMedia.getThumbnailTargetWidth(
    visualItems.length
  );

  const { openMediaLightbox } = useMediaLightbox({ recordId });

  const handlePress = React.useCallback(
    (mediaId: string) => {
      openMediaLightbox(mediaId);
    },
    [openMediaLightbox]
  );

  const renderMediaThumb = React.useCallback(
    (item: Media) => {
      const isProcessing = visualMedia.isProcessing(item);

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
            uri={visualMedia.getThumbnailUri(item)}
            wrapperClassName="rounded-2xl"
          />
          {item.type === 'video' && (
            <View className="absolute inset-0 pointer-events-none items-center justify-center">
              {isProcessing ? (
                <Spinner color={UI.light.contrastForeground} />
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
