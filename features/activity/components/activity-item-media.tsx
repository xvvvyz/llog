import { AudioPlaylist } from '@/features/media/components/audio-player';
import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { useMediaLightbox } from '@/features/media/hooks/use-media-lightbox';
import * as mediaUtils from '@/features/media/lib/media';
import { Media } from '@/features/media/types/media';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Play } from 'phosphor-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

export const ActivityItemMedia = ({ media }: { media?: Media[] }) => {
  const { audioMedia, visualMedia } = useFilteredMedia(media || []);

  const { mediaLightbox, openMediaLightbox } = useMediaLightbox({
    media: visualMedia,
  });

  if (!visualMedia.length && !audioMedia.length) return null;

  const timelineTargetWidth = mediaUtils.getTimelineTargetWidth(
    visualMedia.length
  );

  const renderMediaThumb = (item: Media) => (
    <Pressable
      key={item.id}
      className="flex-1"
      disabled={mediaUtils.isVideoMediaProcessing(item)}
      onPress={() =>
        !mediaUtils.isVideoMediaProcessing(item) && openMediaLightbox(item.id)
      }
    >
      <Image
        fill
        targetWidth={timelineTargetWidth}
        uri={mediaUtils.getVisualMediaThumbnailUri(item)}
        wrapperClassName="rounded-2xl"
      />
      {item.type === 'video' && (
        <View className="absolute inset-0 pointer-events-none items-center justify-center">
          {mediaUtils.isVideoMediaProcessing(item) ? (
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
      {!!visualMedia.length && (
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
      )}
      {audioMedia.length > 0 && (
        <View className="px-4 gap-2">
          <AudioPlaylist clips={audioMedia} />
        </View>
      )}
      {mediaLightbox}
    </React.Fragment>
  );
};
