import { AudioPlayer } from '@/components/ui/audio-player';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { Media } from '@/types/media';
import { clipboardToAssets } from '@/utilities/clipboard-to-assets';
import { id } from '@instantdb/react-native';
import { Image as ImagePrimitive } from 'expo-image';
import { ImagePickerAsset, launchImageLibraryAsync } from 'expo-image-picker';
import { Microphone, Play, Plus, X } from 'phosphor-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

interface PendingUpload {
  id: string;
  uri: string;
  type: 'image' | 'video';
  progress: number;
}

interface UseMediaComposerOptions {
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
}

export const useMediaComposer = ({
  isOpen,
  media,
  onDeleteMedia,
  onOpenAudio,
  onUploadMedia,
}: UseMediaComposerOptions) => {
  const [isDeleteTransitioning, startDeleteTransition] = useTransition();
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const { audioMedia, visualMedia } = useFilteredMedia(media);

  useEffect(() => {
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

  const uploadAssets = useCallback(
    (assets: ImagePickerAsset[]) => {
      const mediaIds = assets.map(() => id());

      setPendingUploads((prev) => [
        ...prev,
        ...assets.map((asset, i) => ({
          id: mediaIds[i],
          uri: asset.uri,
          type: (asset.type === 'video' ? 'video' : 'image') as
            | 'image'
            | 'video',
          progress: 0,
        })),
      ]);

      const baseOrder = media.length;

      assets.forEach((asset, i) => {
        const mediaId = mediaIds[i];

        onUploadMedia(
          asset,
          (progress) => {
            setPendingUploads((prev) =>
              prev.map((p) => (p.id === mediaId ? { ...p, progress } : p))
            );
          },
          mediaId,
          baseOrder + i
        ).catch(() => {
          setPendingUploads((prev) => prev.filter((p) => p.id !== mediaId));
        });
      });
    },
    [onUploadMedia]
  );

  const handleUploadMedia = useCallback(async () => {
    const picker = await launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: false,
      mediaTypes: ['images', 'videos'],
      orderedSelection: true,
    });

    if (picker.canceled) return;
    uploadAssets(picker.assets);
  }, [uploadAssets]);

  const handleDeleteMedia = useCallback(
    (mediaId: string) => startDeleteTransition(() => onDeleteMedia(mediaId)),
    [onDeleteMedia, startDeleteTransition]
  );

  useEffect(() => {
    setPendingUploads((prev) => {
      if (!prev.length) return prev;
      const mediaIds = new Set(visualMedia.map((m) => m.id));
      const next = prev.filter((p) => !mediaIds.has(p.id));
      return next.length === prev.length ? prev : next;
    });
  }, [visualMedia]);

  const pendingIdSet = useMemo(
    () => new Set(pendingUploads.map((p) => p.id)),
    [pendingUploads]
  );

  const realMediaById = useMemo(
    () => new Map(visualMedia.map((m) => [m.id, m])),
    [visualMedia]
  );

  const allVisual = useMemo(
    () => [
      ...visualMedia
        .filter((m) => !pendingIdSet.has(m.id))
        .map((item) => ({ ...item, pending: false, progress: 100 })),
      ...pendingUploads.map((p) => {
        const real = realMediaById.get(p.id);
        if (real) return { ...real, pending: false, progress: 100 };
        return {
          id: p.id,
          uri: p.uri,
          type: p.type,
          pending: true,
          progress: p.progress,
        };
      }),
    ],
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
                className="relative size-16 overflow-hidden bg-border"
                key={item.id}
              >
                <Pressable>
                  {item.pending ? (
                    <View className="size-16">
                      {item.type === 'video' ? (
                        <View className="size-16 items-center justify-center bg-black/60">
                          <Icon
                            className="text-white"
                            icon={Play}
                            size={20}
                            weight="fill"
                          />
                        </View>
                      ) : (
                        <ImagePrimitive
                          contentFit="cover"
                          source={{ uri: item.uri }}
                          style={{ height: 64, width: 64 }}
                        />
                      )}
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
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'absolute',
                          inset: 0,
                          zIndex: 4,
                        }}
                      >
                        {item.progress >= 100 ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={{ color: 'white' }}>
                            {item.progress}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <Image
                      height={64}
                      uri={
                        item.type === 'video'
                          ? (item as Media).previewUri!
                          : item.uri
                      }
                      width={64}
                    />
                  )}
                </Pressable>
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
