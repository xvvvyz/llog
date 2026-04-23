import { AudioPlaylist } from '@/features/media/components/audio-player';
import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { useMediaLightbox } from '@/features/media/hooks/use-media-lightbox';
import * as mediaUtils from '@/features/media/lib/media';
import { Media } from '@/features/media/types/media';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
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
      className="flex-1"
      disabled={mediaUtils.isVideoMediaProcessing(item)}
      key={item.id}
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
        <View className="pointer-events-none absolute inset-0 items-center justify-center">
          {mediaUtils.isVideoMediaProcessing(item) ? (
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
        <View className="gap-2 px-4">
          <AudioPlaylist clips={audioMedia} />
        </View>
      )}
      {mediaLightbox}
    </React.Fragment>
  );
};
