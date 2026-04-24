import { MediaComposerPendingVideoPreview } from '@/features/media/components/media-composer-pending-video-preview';
import { MediaComposerPreviewImage } from '@/features/media/components/media-composer-preview-image';
import * as media from '@/features/media/lib/media';
import type * as mediaComposer from '@/features/media/types/media-composer.types';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { Play, X } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export const MediaComposerVisualPreview = ({
  autoPlayPendingVideoId,
  onDeleteMedia,
  onOpenVisual,
  onRemoteReady,
  visualItems,
}: {
  autoPlayPendingVideoId?: string;
  onDeleteMedia: (mediaId: string) => void;
  onOpenVisual: (mediaId: string) => void;
  onRemoteReady: (mediaId: string) => void;
  visualItems: mediaComposer.VisualPreviewItem[];
}) => {
  if (!visualItems.length) return null;

  return (
    <ScrollView
      className="border-border-secondary border-t grow-0 shrink-0"
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={{ borderCurve: 'continuous' }}
      testID="scroll-lock-allow"
    >
      <View className="flex-row p-4 gap-3">
        {visualItems.map((item) => (
          <View key={item.id} className="relative size-16">
            <Pressable
              className={
                item.pending
                  ? 'bg-border flex-1 cursor-default overflow-hidden rounded-lg'
                  : 'bg-border flex-1 overflow-hidden rounded-lg'
              }
              onPress={() => {
                if (!item.pending) onOpenVisual(item.id);
              }}
            >
              {item.pending ? (
                <View className="flex-1 bg-card">
                  {item.type === 'video' ? (
                    <MediaComposerPendingVideoPreview
                      autoPlay={item.id === autoPlayPendingVideoId}
                      height={item.height}
                      uri={item.localUri ?? item.uri}
                      width={item.width}
                    />
                  ) : (
                    <Image
                      contentFit="cover"
                      fill
                      uri={item.localUri ?? item.uri}
                      wrapperClassName="bg-card"
                    />
                  )}
                  <View className="absolute inset-0 z-[4] items-center justify-center">
                    <Spinner className="scale-[0.8]" size="small" />
                  </View>
                </View>
              ) : (
                <MediaComposerPreviewImage
                  item={item}
                  onRemoteReady={onRemoteReady}
                />
              )}
            </Pressable>
            {item.type === 'video' &&
              !item.pending &&
              !media.isVideoMediaProcessing(item) && (
                <View className="absolute bottom-0 left-0 z-10 size-6 pointer-events-none items-center justify-center">
                  <Icon
                    className="text-contrast-foreground"
                    icon={Play}
                    size={12}
                  />
                </View>
              )}
            {!item.pending && (
              <Pressable
                className="absolute right-0 top-0 z-20 size-6 items-center justify-center"
                onPress={() => onDeleteMedia(item.id)}
              >
                <Icon className="text-contrast-foreground" icon={X} size={12} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
