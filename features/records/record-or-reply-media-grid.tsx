import * as media from '@/lib/media';
import { UI } from '@/theme/ui';
import { Media } from '@/types/media';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { router } from 'expo-router';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

export const RecordOrReplyMediaGrid = ({
  fallbackRecordId,
  recordId,
  replyId,
  visualMedia,
}: {
  fallbackRecordId?: string;
  recordId: string;
  replyId?: string;
  visualMedia: Media[];
}) => {
  const resolvedRecordId = recordId || fallbackRecordId;

  const idIndexMap = React.useMemo(() => {
    const next: Record<string, number> = {};

    visualMedia.forEach((item, index) => {
      next[item.id] = index;
    });

    return next;
  }, [visualMedia]);

  const timelineTargetWidth = media.getTimelineTargetWidth(visualMedia.length);

  const handlePress = React.useCallback(
    (mediaId: string) => {
      if (!resolvedRecordId) return;

      router.push({
        pathname: `/record/[recordId]/media`,
        params: {
          recordId: resolvedRecordId,
          ...(replyId && { replyId }),
          defaultIndex: String(idIndexMap[mediaId]),
        },
      });
    },
    [idIndexMap, replyId, resolvedRecordId]
  );

  const renderMediaThumb = React.useCallback(
    (item: Media) => {
      const isProcessing = media.isVideoMediaProcessing(item);

      return (
        <Pressable
          className="flex-1"
          disabled={!resolvedRecordId || isProcessing}
          key={item.id}
          onPress={() => handlePress(item.id)}
        >
          <Image
            fill
            targetWidth={timelineTargetWidth}
            uri={media.getVisualMediaThumbnailUri(item)}
            wrapperClassName="rounded-2xl"
          />
          {item.type === 'video' && (
            <View className="pointer-events-none absolute inset-0 items-center justify-center">
              {isProcessing ? (
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
    },
    [handlePress, resolvedRecordId, timelineTargetWidth]
  );

  if (!visualMedia.length) return null;

  return (
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
  );
};
