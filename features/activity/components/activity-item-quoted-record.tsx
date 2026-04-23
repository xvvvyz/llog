import { AudioPlaylist } from '@/features/media/components/audio-player';
import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { useMediaLightbox } from '@/features/media/hooks/use-media-lightbox';
import * as mediaUtils from '@/features/media/lib/media';
import { Media } from '@/features/media/types/media';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Text } from '@/ui/text';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

export const ActivityItemQuotedRecord = ({
  logColor,
  media,
  text,
}: {
  logColor: { lighter: string; default: string; darker: string } | null;
  media?: Media[];
  text?: string;
}) => {
  const { audioMedia, visualMedia } = useFilteredMedia(media || []);
  const displayText = trimDisplayText(text);

  const { mediaLightbox, openMediaLightbox } = useMediaLightbox({
    media: visualMedia,
  });

  const hasAudioMedia = audioMedia.length > 0;

  if (!displayText && !visualMedia.length && !hasAudioMedia) return null;

  return (
    <React.Fragment>
      <View
        className={cn(
          'bg-input max-w-full min-w-0 overflow-hidden rounded-xl',
          hasAudioMedia ? 'w-full self-stretch' : 'self-start'
        )}
      >
        {!!displayText && (
          <View className="max-w-full min-w-0 flex-row gap-3 p-3">
            <View
              className="bg-border w-1 self-stretch rounded-full"
              style={
                logColor ? { backgroundColor: logColor.default } : undefined
              }
            />
            <Text
              className="text-muted-foreground max-w-full shrink text-sm"
              numberOfLines={1}
            >
              {displayText}
            </Text>
          </View>
        )}
        {!!visualMedia.length && (
          <ScrollView
            className="max-w-full grow-0 self-start"
            contentContainerClassName={cn(
              'px-3 pb-3',
              displayText ? 'pt-0' : 'pt-3'
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View className="flex-row gap-0.5">
              {visualMedia.map((item) => (
                <Pressable
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                  disabled={mediaUtils.isVideoMediaProcessing(item)}
                  key={item.id}
                  onPress={() =>
                    !mediaUtils.isVideoMediaProcessing(item) &&
                    openMediaLightbox(item.id)
                  }
                >
                  <Image
                    contentFit="cover"
                    height={64}
                    targetHeight={128}
                    targetWidth={128}
                    uri={mediaUtils.getVisualMediaThumbnailUri(item)}
                    width={64}
                  />
                  {item.type === 'video' && (
                    <View className="pointer-events-none absolute inset-0 items-center justify-center">
                      {mediaUtils.isVideoMediaProcessing(item) ? (
                        <ActivityIndicator
                          color={UI.light.contrastForeground}
                          size="small"
                        />
                      ) : (
                        <View className="bg-contrast-background/50 size-6 items-center justify-center rounded-full">
                          <Icon
                            className="text-contrast-foreground"
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
        {hasAudioMedia && (
          <View
            className={cn(
              'gap-2 px-3 pb-3',
              !displayText && !visualMedia.length && 'pt-3'
            )}
          >
            <AudioPlaylist
              clips={audioMedia}
              compact
              showPlaybackRate={false}
            />
          </View>
        )}
      </View>
      {mediaLightbox}
    </React.Fragment>
  );
};
