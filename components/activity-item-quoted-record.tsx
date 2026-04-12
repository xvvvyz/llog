import { AudioPlaylist } from '@/components/ui/audio-player';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { Media } from '@/types/media';
import { cn } from '@/utilities/cn';
import { router } from 'expo-router';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { Pressable, ScrollView, View } from 'react-native';

export const ActivityItemQuotedRecord = ({
  logColor,
  media,
  recordId,
  text,
}: {
  logColor: { lighter: string; default: string; darker: string } | null;
  media?: Media[];
  recordId: string;
  text?: string;
}) => {
  const { audioMedia, visualMedia } = useFilteredMedia(media || []);
  if (!text && !visualMedia.length && !audioMedia.length) return null;

  return (
    <View
      className={cn(
        'max-w-full overflow-hidden rounded-xl bg-input',
        !audioMedia.length && 'self-start'
      )}
    >
      {!!text && (
        <View className="flex-row gap-3 p-3">
          <View
            className="w-1 self-stretch rounded-full bg-border"
            style={logColor ? { backgroundColor: logColor.default } : undefined}
          />
          <Text
            className="flex-1 text-sm text-muted-foreground"
            numberOfLines={1}
          >
            {text}
          </Text>
        </View>
      )}
      {!!visualMedia.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: text ? 0 : 12,
            paddingBottom: 12,
          }}
        >
          <View className="flex-row gap-0.5">
            {visualMedia.map((item) => (
              <Pressable
                key={item.id}
                className="overflow-hidden rounded-lg"
                style={{ width: 64, height: 64 }}
                onPress={() =>
                  router.push({
                    pathname: `/record/[recordId]/media`,
                    params: {
                      recordId,
                      defaultIndex: String(visualMedia.indexOf(item)),
                    },
                  })
                }
              >
                <Image
                  fill
                  uri={item.type === 'video' ? item.previewUri! : item.uri}
                />
                {item.type === 'video' && (
                  <View
                    className="absolute inset-0 items-center justify-center"
                    pointerEvents="none"
                  >
                    <View
                      className="items-center justify-center rounded-full"
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                      }}
                    >
                      <Icon
                        className="ml-0.5 text-white"
                        icon={Play}
                        size={12}
                        weight="fill"
                      />
                    </View>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {audioMedia.length > 0 && (
        <View
          className={cn(
            'gap-2 px-3 pb-3',
            !text && !visualMedia.length && 'pt-3'
          )}
        >
          <AudioPlaylist clips={audioMedia} compact />
        </View>
      )}
    </View>
  );
};
