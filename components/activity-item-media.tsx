import { AudioPlaylist } from '@/components/ui/audio-player';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { Media } from '@/types/media';
import { router } from 'expo-router';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { Pressable, View } from 'react-native';

export const ActivityItemMedia = ({
  media,
  recordId,
  commentId,
}: {
  media?: Media[];
  recordId?: string;
  commentId?: string;
}) => {
  const { audioMedia, visualMedia } = useFilteredMedia(media || []);
  if (!visualMedia.length && !audioMedia.length) return null;

  const renderMediaThumb = (item: Media) => (
    <Pressable
      className="flex-1"
      key={item.id}
      onPress={() =>
        recordId &&
        router.push({
          pathname: `/record/[recordId]/media`,
          params: {
            recordId,
            ...(commentId && { commentId }),
            defaultIndex: String(visualMedia.indexOf(item)),
          },
        })
      }
    >
      <Image
        fill
        uri={item.type === 'video' ? item.previewUri! : item.uri}
        wrapperClassName="rounded-2xl"
      />
      {item.type === 'video' && (
        <View
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          >
            <Icon
              className="ml-0.5 text-white"
              icon={Play}
              size={20}
              weight="fill"
            />
          </View>
        </View>
      )}
    </Pressable>
  );

  return (
    <>
      {!!visualMedia.length && (
        <View className="gap-0.5" style={{ aspectRatio: 3 / 2 }}>
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
