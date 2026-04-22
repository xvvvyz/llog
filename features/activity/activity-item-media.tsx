import { AudioPlaylist } from '@/features/media/audio-player';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import * as mediaUtils from '@/lib/media';
import { UI } from '@/theme/ui';
import { Media } from '@/types/media';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { router } from 'expo-router';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { ActivityIndicator, Pressable, View } from 'react-native';

export const ActivityItemMedia = ({
  media,
  recordId,
  replyId,
}: {
  media?: Media[];
  recordId?: string;
  replyId?: string;
}) => {
  const { audioMedia, visualMedia } = useFilteredMedia(media || []);
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
        !mediaUtils.isVideoMediaProcessing(item) &&
        recordId &&
        router.push({
          pathname: `/record/[recordId]/media`,
          params: {
            recordId,
            ...(replyId && { replyId }),
            defaultIndex: String(visualMedia.indexOf(item)),
          },
        })
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
    <>
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
    </>
  );
};
