import { PendingVideoPreview } from '@/features/media/components/composer/pending-video-preview';
import { PreviewImage } from '@/features/media/components/composer/preview-image';
import * as visualMedia from '@/features/media/lib/visual-media';
import type * as mediaComposer from '@/features/media/types/composer';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { Play, X } from 'phosphor-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export const VisualPreview = ({
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
      className="grow-0 shrink-0"
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={{ borderCurve: 'continuous' }}
      testID="scroll-lock-allow"
    >
      <View className="flex-row px-4 gap-3">
        {visualItems.map((item) => (
          <View key={item.id} className="relative size-16">
            {item.pending ? (
              <View className="flex-1 overflow-hidden rounded-lg bg-border cursor-default">
                <View className="flex-1 bg-card">
                  {item.type === 'video' ? (
                    <PendingVideoPreview
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
                  <View className="absolute inset-0 z-[4] pointer-events-none items-center justify-center">
                    <Spinner size="xs" />
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                className="flex-1 overflow-hidden rounded-lg bg-border"
                onPress={() => onOpenVisual(item.id)}
              >
                <PreviewImage item={item} onRemoteReady={onRemoteReady} />
              </Pressable>
            )}
            {item.type === 'video' &&
              !item.pending &&
              !visualMedia.isProcessing(item) && (
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
