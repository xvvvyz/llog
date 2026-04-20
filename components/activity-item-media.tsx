import { AudioPlaylist } from '@/components/ui/audio-player';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { Media } from '@/types/media';
import * as m from '@/utilities/media';
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

  const renderMediaThumb = (item: Media) => (
    <Pressable
      className="flex-1"
      disabled={m.isVideoMediaProcessing(item)}
      key={item.id}
      onPress={() =>
        !m.isVideoMediaProcessing(item) &&
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
        uri={m.getVisualMediaThumbnailUri(item)}
        wrapperClassName="rounded-2xl"
      />
      {item.type === 'video' && (
        <View className="pointer-events-none absolute inset-0 items-center justify-center">
          {m.isVideoMediaProcessing(item) ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="size-10 items-center justify-center rounded-full bg-black/50">
              <Icon
                className="text-white"
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
