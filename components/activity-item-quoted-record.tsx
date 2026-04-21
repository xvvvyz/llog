import { AudioPlaylist } from '@/components/ui/audio-player';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { Media } from '@/types/media';
import { cn } from '@/utilities/cn';
import * as m from '@/utilities/media';
import { router } from 'expo-router';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

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
        'bg-input max-w-full min-w-0 self-start overflow-hidden rounded-xl'
      )}
    >
      {!!text && (
        <View className="max-w-full min-w-0 flex-row gap-3 p-3">
          <View
            className="bg-border w-1 self-stretch rounded-full"
            style={logColor ? { backgroundColor: logColor.default } : undefined}
          />
          <Text
            className="text-muted-foreground max-w-full shrink text-sm"
            numberOfLines={1}
          >
            {text}
          </Text>
        </View>
      )}
      {!!visualMedia.length && (
        <ScrollView
          className="max-w-full self-start"
          contentContainerClassName={cn('px-3 pb-3', text ? 'pt-0' : 'pt-3')}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
        >
          <View className="flex-row gap-0.5">
            {visualMedia.map((item, index) => (
              <Pressable
                disabled={m.isVideoMediaProcessing(item)}
                key={item.id}
                className="h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                onPress={() =>
                  !m.isVideoMediaProcessing(item) &&
                  router.push({
                    pathname: `/record/[recordId]/media`,
                    params: {
                      recordId,
                      defaultIndex: String(index),
                    },
                  })
                }
              >
                <Image
                  contentFit="cover"
                  height={64}
                  uri={m.getVisualMediaThumbnailUri(item)}
                  width={64}
                />
                {item.type === 'video' && (
                  <View className="pointer-events-none absolute inset-0 items-center justify-center">
                    {m.isVideoMediaProcessing(item) ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <View className="size-6 items-center justify-center rounded-full bg-black/50">
                        <Icon
                          className="text-white"
                          icon={Play}
                          size={12}
                          weight="fill"
                        />
                      </View>
                    )}
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
