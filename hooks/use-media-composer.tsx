import { AudioPlayer } from '@/components/ui/audio-player';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { Media } from '@/types/media';
import { clipboardToAssets } from '@/utilities/clipboard-to-assets';
import { ImagePickerAsset, launchImageLibraryAsync } from 'expo-image-picker';
import { Image as ImageIcon, Microphone, X } from 'phosphor-react-native';
import { useCallback, useEffect, useTransition } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

interface UseMediaComposerOptions {
  isOpen: boolean;
  media: Media[];
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onOpenAudio: () => void;
  onUploadImages: (assets: ImagePickerAsset[]) => Promise<void>;
}

export const useMediaComposer = ({
  isOpen,
  media,
  onDeleteMedia,
  onOpenAudio,
  onUploadImages,
}: UseMediaComposerOptions) => {
  const [isDeleteTransitioning, startDeleteTransition] = useTransition();
  const [isUploadTransitioning, startUploadTransition] = useTransition();
  const { audioMedia, imageMedia } = useFilteredMedia(media);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;

    const handler = async (e: ClipboardEvent) => {
      if (!e.clipboardData?.items.length) return;
      const assets = await clipboardToAssets(e.clipboardData.items);
      if (!assets.length) return;
      e.preventDefault();
      startUploadTransition(() => onUploadImages(assets));
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [isOpen, onUploadImages, startUploadTransition]);

  const handleUploadImages = useCallback(async () => {
    const picker = await launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: false,
      orderedSelection: true,
    });

    if (picker.canceled) return;

    startUploadTransition(() => onUploadImages(picker.assets));
  }, [onUploadImages, startUploadTransition]);

  const handleDeleteMedia = useCallback(
    (mediaId: string) => startDeleteTransition(() => onDeleteMedia(mediaId)),
    [onDeleteMedia, startDeleteTransition]
  );

  const mediaPreview = (
    <>
      {!!imageMedia.length && (
        <ScrollView
          className="shrink-0 border-t border-border-secondary"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderCurve: 'continuous' }}
        >
          <View className="flex-row gap-3 p-4">
            {imageMedia.map((image) => (
              <View className="relative" key={image.id}>
                <Pressable>
                  <Image
                    height={64}
                    uri={image.uri}
                    width={64}
                    wrapperClassName="rounded"
                  />
                </Pressable>
                <Button
                  className="size-6 rounded-full"
                  onPress={() => handleDeleteMedia(image.id)}
                  size="icon"
                  variant="link"
                  wrapperClassName="transition-colors rounded-full bg-background/50 hover:bg-background/60 absolute right-1 top-1"
                >
                  <Icon className="text-foreground" icon={X} />
                </Button>
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
      <Button onPress={onOpenAudio} size="xs" variant="secondary">
        <Icon icon={Microphone} />
        <Text>Audio</Text>
      </Button>
      <Button onPress={handleUploadImages} size="xs" variant="secondary">
        <Icon icon={ImageIcon} />
        <Text>Visuals</Text>
      </Button>
    </>
  );

  return {
    isBusy: isUploadTransitioning || isDeleteTransitioning,
    mediaPreview,
    toolbar,
  };
};
