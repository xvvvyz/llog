import { AudioPlaylist } from '@/features/media/components/audio-player';
import { DocumentAttachments } from '@/features/media/components/document-attachments';
import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { useMediaLightbox } from '@/features/media/hooks/use-lightbox';
import * as visualMedia from '@/features/media/lib/visual-media';
import { Media } from '@/features/media/types/media';
import { trimDisplayText } from '@/features/records/lib/trim-display-text';
import { cn } from '@/lib/cn';
import { UI } from '@/theme/ui';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Text } from '@/ui/text';
import { Play } from 'phosphor-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

export const QuotedRecord = ({
  logColor,
  media,
  recordId,
  text,
}: {
  logColor: { lighter: string; default: string; darker: string } | null;
  media?: Media[];
  recordId?: string;
  text?: string;
}) => {
  const {
    audioMedia,
    documentMedia,
    visualMedia: visualItems,
  } = useFilteredMedia(media || []);

  const displayText = trimDisplayText(text);
  const { openMediaLightbox } = useMediaLightbox({ recordId });
  const hasAudioMedia = audioMedia.length > 0;
  const hasDocumentMedia = documentMedia.length > 0;

  if (
    !displayText &&
    !visualItems.length &&
    !hasAudioMedia &&
    !hasDocumentMedia
  ) {
    return null;
  }

  return (
    <React.Fragment>
      <View
        className={cn(
          'bg-input max-w-full min-w-0 overflow-hidden rounded-xl',
          hasAudioMedia || hasDocumentMedia
            ? 'w-full self-stretch'
            : 'self-start'
        )}
      >
        {!!displayText && (
          <View className="flex-row max-w-full min-w-0 p-3 gap-3">
            <View
              className="w-1 rounded-full bg-border self-stretch"
              style={
                logColor ? { backgroundColor: logColor.default } : undefined
              }
            />
            <Text
              className="max-w-full text-muted-foreground text-sm shrink"
              numberOfLines={1}
            >
              {displayText}
            </Text>
          </View>
        )}
        {!!visualItems.length && (
          <ScrollView
            className="max-w-full grow-0 self-start"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName={cn(
              'px-3 pb-3',
              displayText ? 'pt-0' : 'pt-3'
            )}
          >
            <View className="flex-row gap-0.5">
              {visualItems.map((item) => (
                <Pressable
                  key={item.id}
                  className="overflow-hidden h-16 w-16 rounded-lg shrink-0"
                  disabled={visualMedia.isProcessing(item) || !recordId}
                  onPress={() =>
                    !visualMedia.isProcessing(item) &&
                    openMediaLightbox(item.id)
                  }
                >
                  <Image
                    contentFit="cover"
                    height={64}
                    targetHeight={128}
                    targetWidth={128}
                    uri={visualMedia.getThumbnailUri(item)}
                    width={64}
                  />
                  {item.type === 'video' && (
                    <View className="absolute inset-0 pointer-events-none items-center justify-center">
                      {visualMedia.isProcessing(item) ? (
                        <ActivityIndicator
                          color={UI.light.contrastForeground}
                          size="small"
                        />
                      ) : (
                        <View className="size-6 rounded-full bg-contrast-background/50 items-center justify-center">
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
              !displayText && !visualItems.length && 'pt-3',
              hasDocumentMedia && 'pb-0'
            )}
          >
            <AudioPlaylist
              clips={audioMedia}
              compact
              showPlaybackRate={false}
            />
          </View>
        )}
        {hasDocumentMedia && (
          <DocumentAttachments
            documents={documentMedia}
            triggerClassName="px-3"
            triggerIconClassName="-ml-px"
            className={cn(
              'pb-3',
              !displayText && !visualItems.length && !hasAudioMedia && 'pt-3'
            )}
          />
        )}
      </View>
    </React.Fragment>
  );
};
