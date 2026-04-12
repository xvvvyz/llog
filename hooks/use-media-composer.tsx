import { AudioPlayer } from '@/components/ui/audio-player';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { UI } from '@/theme/ui';
import { Media } from '@/types/media';
import { clipboardToAssets } from '@/utilities/clipboard-to-assets';
import { fileUriToSrc, useFileAccessToken } from '@/utilities/file-uri-to-src';
import { id } from '@instantdb/react-native';
import { Image as ImagePrimitive } from 'expo-image';
import { ImagePickerAsset, launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { Microphone } from 'phosphor-react-native/lib/module/icons/Microphone';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
import { X } from 'phosphor-react-native/lib/module/icons/X';
import * as React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

interface PendingUpload {
  id: string;
  order: number;
  uri: string;
  type: 'image' | 'video';
  progress: number;
}

interface UseMediaComposerOptions {
  commentId?: string;
  isOpen: boolean;
  media: Media[];
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onOpenAudio: () => void;
  onUploadMedia: (
    asset: ImagePickerAsset,
    onProgress: (progress: number) => void,
    mediaId: string,
    order: number
  ) => Promise<void>;
  recordId?: string;
}

export const useMediaComposer = ({
  commentId,
  isOpen,
  media,
  onDeleteMedia,
  onOpenAudio,
  onUploadMedia,
  recordId,
}: UseMediaComposerOptions) => {
  const { suspend } = useSheetManager();
  const colorScheme = useColorScheme();
  const foregroundColor = UI[colorScheme].foreground;
  const fileAccessToken = useFileAccessToken();
  const [isDeleteTransitioning, startDeleteTransition] = React.useTransition();
  const { audioMedia, visualMedia } = useFilteredMedia(media);

  const [pendingUploads, setPendingUploads] = React.useState<PendingUpload[]>(
    []
  );

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;

    const handler = async (e: ClipboardEvent) => {
      if (!e.clipboardData?.items.length) return;
      const assets = await clipboardToAssets(e.clipboardData.items);
      if (!assets.length) return;
      e.preventDefault();
      uploadAssets(assets);
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [isOpen, onUploadMedia]);

  const uploadAssets = React.useCallback(
    (assets: ImagePickerAsset[]) => {
      const mediaIds = assets.map(() => id());
      const baseOrder = media.length;

      setPendingUploads((prev) => [
        ...prev,
        ...assets.map((asset, i) => ({
          id: mediaIds[i],
          order: baseOrder + i,
          uri: asset.uri,
          type: (asset.type === 'video' ? 'video' : 'image') as
            | 'image'
            | 'video',
          progress: 0,
        })),
      ]);

      const concurrency = 2;

      const queue = assets.map((asset, i) => ({
        asset,
        mediaId: mediaIds[i],
        order: baseOrder + i,
      }));

      const run = async (items: typeof queue) => {
        for (const { asset, mediaId, order } of items) {
          try {
            await onUploadMedia(
              asset,
              (progress) => {
                setPendingUploads((prev) =>
                  prev.map((p) => (p.id === mediaId ? { ...p, progress } : p))
                );
              },
              mediaId,
              order
            );
          } catch {
            setPendingUploads((prev) => prev.filter((p) => p.id !== mediaId));
          }
        }
      };

      const lanes: (typeof queue)[] = Array.from(
        { length: concurrency },
        () => []
      );

      queue.forEach((item, i) => lanes[i % concurrency].push(item));
      lanes.forEach((lane) => run(lane));
    },
    [onUploadMedia]
  );

  const handleUploadMedia = React.useCallback(async () => {
    const picker = await launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: false,
      mediaTypes: ['images', 'videos'],
      orderedSelection: true,
    });

    if (picker.canceled) return;
    uploadAssets(picker.assets);
  }, [uploadAssets]);

  const handleDeleteMedia = React.useCallback(
    (mediaId: string) => startDeleteTransition(() => onDeleteMedia(mediaId)),
    [onDeleteMedia, startDeleteTransition]
  );

  React.useEffect(() => {
    setPendingUploads((prev) => {
      if (!prev.length) return prev;
      const mediaIds = new Set(visualMedia.map((m) => m.id));
      const next = prev.filter((p) => !mediaIds.has(p.id));
      return next.length === prev.length ? prev : next;
    });
  }, [visualMedia]);

  const pendingIdSet = React.useMemo(
    () => new Set(pendingUploads.map((p) => p.id)),
    [pendingUploads]
  );

  const realMediaById = React.useMemo(
    () => new Map(visualMedia.map((m) => [m.id, m])),
    [visualMedia]
  );

  const allVisual = React.useMemo(
    () =>
      [
        ...visualMedia
          .filter((m) => !pendingIdSet.has(m.id))
          .map((item) => ({
            ...item,
            pending: false,
            progress: 100,
            localUri: undefined as string | undefined,
          })),
        ...pendingUploads.map((p) => {
          const real = realMediaById.get(p.id);
          if (real)
            return {
              ...real,
              order: p.order,
              pending: false,
              progress: 100,
              localUri: p.uri,
            };

          return {
            id: p.id,
            order: p.order,
            uri: p.uri,
            type: p.type,
            pending: true,
            progress: p.progress,
            localUri: p.uri,
          };
        }),
      ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [visualMedia, pendingUploads, pendingIdSet, realMediaById]
  );

  const mediaPreview = (
    <>
      {!!allVisual.length && (
        <ScrollView
          className="shrink-0 border-t border-border-secondary"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderCurve: 'continuous' }}
        >
          <View className="flex-row gap-3 p-4">
            {allVisual.map((item) => (
              <View
                className="relative size-16 overflow-hidden rounded-lg bg-border"
                key={item.id}
              >
                <Pressable
                  className={item.pending ? 'cursor-default' : undefined}
                  onPress={() => {
                    if (!item.pending && recordId) {
                      suspend();

                      router.push({
                        pathname: '/record/[recordId]/media',
                        params: {
                          recordId,
                          ...(commentId && { commentId }),
                          id: item.id,
                        },
                      });
                    }
                  }}
                >
                  {item.pending ? (
                    <View className="size-16 bg-card">
                      {item.type !== 'video' && (
                        <ImagePrimitive
                          contentFit="cover"
                          source={{ uri: item.uri }}
                          style={{ height: 64, width: 64 }}
                        />
                      )}
                      {item.progress > 0 && (
                        <View
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            bottom: 0,
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            width: `${100 - item.progress}%`,
                            zIndex: 3,
                          }}
                        />
                      )}
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'absolute',
                          inset: 0,
                          zIndex: 4,
                        }}
                      >
                        {item.progress > 0 && item.progress < 100 ? (
                          <Text className="text-white">{item.progress}</Text>
                        ) : (
                          <ActivityIndicator
                            size="small"
                            color={foregroundColor}
                          />
                        )}
                      </View>
                    </View>
                  ) : (
                    <ImagePrimitive
                      contentFit="cover"
                      placeholder={
                        item.localUri ? { uri: item.localUri } : undefined
                      }
                      placeholderContentFit="cover"
                      source={fileUriToSrc(
                        item.type === 'video'
                          ? (item as Media).previewUri!
                          : item.uri,
                        fileAccessToken
                      )}
                      style={{ height: 64, width: 64 }}
                    />
                  )}
                </Pressable>
                {!item.pending && (
                  <Pressable
                    onPress={() => handleDeleteMedia(item.id)}
                    style={{
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderCurve: 'continuous',
                      borderRadius: 6,
                      height: 20,
                      justifyContent: 'center',
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      width: 20,
                      zIndex: 5,
                    }}
                  >
                    <Icon className="text-white" icon={X} size={10} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {audioMedia.length > 0 && (
        <View className="gap-2 border-t border-border-secondary p-4">
          {audioMedia.map((clip) => (
            <View className="flex-row items-center gap-2" key={clip.id}>
              <View className="flex-1">
                <AudioPlayer uri={clip.uri} duration={clip.duration!} />
              </View>
              <Button
                className="size-6 rounded-full"
                onPress={() => handleDeleteMedia(clip.id)}
                size="icon"
                variant="link"
              >
                <Icon className="text-muted-foreground" icon={X} />
              </Button>
            </View>
          ))}
        </View>
      )}
    </>
  );

  const toolbar = (
    <>
      <Button
        className="size-8"
        onPress={handleUploadMedia}
        size="icon"
        variant="secondary"
      >
        <Icon icon={Plus} />
      </Button>
      <Button
        className="size-8"
        onPress={onOpenAudio}
        size="icon"
        variant="secondary"
      >
        <Icon icon={Microphone} />
      </Button>
    </>
  );

  return {
    isBusy: pendingUploads.length > 0 || isDeleteTransitioning,
    mediaPreview,
    toolbar,
  };
};
