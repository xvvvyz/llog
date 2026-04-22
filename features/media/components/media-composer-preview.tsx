import { AudioPlayer } from '@/features/media/components/audio-player';
import { VideoPlayer } from '@/features/media/components/video-player';
import { useFileUriToSrc } from '@/features/media/lib/file-uri-to-src';
import * as media from '@/features/media/lib/media';
import type { Media } from '@/features/media/types/media';
import type * as mediaComposer from '@/features/media/types/media-composer.types';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Image as ImagePrimitive } from 'expo-image';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { X } from 'phosphor-react-native/lib/module/icons/X';
import * as React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const SHEET_MEDIA_PREVIEW_SIZE = 64;
const SHEET_PENDING_VIDEO_OVERFLOW = 16;

const PendingVideoPreview = ({
  autoPlay,
  height,
  uri,
  width,
}: {
  autoPlay?: boolean;
  height?: number;
  uri: string;
  width?: number;
}) => {
  const src = useFileUriToSrc(uri);

  const coverFrameStyle = React.useMemo(() => {
    if (!width || !height) {
      return {
        height: SHEET_MEDIA_PREVIEW_SIZE + SHEET_PENDING_VIDEO_OVERFLOW,
        width: SHEET_MEDIA_PREVIEW_SIZE + SHEET_PENDING_VIDEO_OVERFLOW,
      };
    }

    const scale = Math.max(
      SHEET_MEDIA_PREVIEW_SIZE / width,
      SHEET_MEDIA_PREVIEW_SIZE / height
    );

    return {
      height: height * scale + SHEET_PENDING_VIDEO_OVERFLOW,
      width: width * scale + SHEET_PENDING_VIDEO_OVERFLOW,
    };
  }, [height, width]);

  if (Platform.OS === 'web') {
    return (
      <View className="bg-card h-full w-full overflow-hidden">
        <video
          autoPlay={autoPlay}
          loop
          muted
          playsInline
          preload="metadata"
          src={src ?? undefined}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </View>
    );
  }

  return (
    <View className="bg-card h-full w-full items-center justify-center overflow-hidden">
      <View style={coverFrameStyle}>
        <VideoPlayer
          autoPlay={autoPlay}
          contentFit="cover"
          maxHeight={coverFrameStyle.height}
          maxWidth={coverFrameStyle.width}
          muted
          uri={uri}
        />
      </View>
    </View>
  );
};

const SheetVisualPreviewImage = ({
  item,
  onRemoteReady,
}: {
  item: mediaComposer.VisualPreviewItem;
  onRemoteReady: (mediaId: string) => void;
}) => {
  const remoteSrc = useFileUriToSrc(media.getVisualMediaThumbnailUri(item));
  const remoteSource = remoteSrc ? { uri: remoteSrc } : null;

  const [isRemoteReady, setIsRemoteReady] = React.useState(false);
  const shouldHoldLocalPreview = item.type === 'image' && !!item.localUri;
  const showRemoteLoadingIndicator = !isRemoteReady && !shouldHoldLocalPreview;

  React.useEffect(() => {
    setIsRemoteReady(false);
  }, [item.id, remoteSrc]);

  const handleRemoteReady = React.useCallback(() => {
    setIsRemoteReady(true);
    if (shouldHoldLocalPreview) onRemoteReady(item.id);
  }, [item.id, onRemoteReady, shouldHoldLocalPreview]);

  return (
    <View className="bg-card relative flex-1">
      {shouldHoldLocalPreview && (
        <ImagePrimitive
          contentFit="cover"
          contentPosition="center"
          source={{ uri: item.localUri }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {remoteSource && (
        <ImagePrimitive
          contentFit="cover"
          contentPosition="center"
          onDisplay={handleRemoteReady}
          onLoad={handleRemoteReady}
          source={remoteSource}
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: shouldHoldLocalPreview && !isRemoteReady ? 0 : 1,
          }}
        />
      )}
      {showRemoteLoadingIndicator && (
        <View className="absolute inset-0 items-center justify-center">
          <Spinner size="small" style={{ transform: [{ scale: 0.8 }] }} />
        </View>
      )}
    </View>
  );
};

export const MediaComposerPreview = ({
  audioMedia,
  autoPlayPendingVideoId,
  onDeleteMedia,
  onOpenVisual,
  onRemoteReady,
  pendingAudio,
  visualItems,
}: {
  audioMedia: Media[];
  autoPlayPendingVideoId?: string;
  onDeleteMedia: (mediaId: string) => void;
  onOpenVisual: (mediaId: string) => void;
  onRemoteReady: (mediaId: string) => void;
  pendingAudio: mediaComposer.PendingAudioUpload[];
  visualItems: mediaComposer.VisualPreviewItem[];
}) => {
  return (
    <>
      {!!visualItems.length && (
        <ScrollView
          className="border-border-secondary shrink-0 border-t"
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={{ borderCurve: 'continuous' }}
        >
          <View className="flex-row gap-3 p-4">
            {visualItems.map((item) => (
              <View className="relative size-16" key={item.id}>
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
                    <View className="bg-card flex-1">
                      {item.type === 'video' ? (
                        <PendingVideoPreview
                          autoPlay={item.id === autoPlayPendingVideoId}
                          height={item.height}
                          uri={item.localUri ?? item.uri}
                          width={item.width}
                        />
                      ) : (
                        <Image
                          fill
                          contentFit="cover"
                          uri={item.localUri ?? item.uri}
                          wrapperClassName="bg-card"
                        />
                      )}
                      <View className="absolute inset-0 z-[4] items-center justify-center">
                        <Spinner
                          size="small"
                          style={{ transform: [{ scale: 0.8 }] }}
                        />
                      </View>
                    </View>
                  ) : (
                    <SheetVisualPreviewImage
                      item={item}
                      onRemoteReady={onRemoteReady}
                    />
                  )}
                </Pressable>
                {item.type === 'video' &&
                  !item.pending &&
                  !media.isVideoMediaProcessing(item) && (
                    <View className="pointer-events-none absolute bottom-0 left-0 z-10 size-6 items-center justify-center">
                      <Icon
                        className="text-contrast-foreground"
                        icon={Play}
                        size={12}
                      />
                    </View>
                  )}
                {!item.pending && (
                  <Pressable
                    className="absolute top-0 right-0 z-20 size-6 items-center justify-center"
                    onPress={() => onDeleteMedia(item.id)}
                  >
                    <Icon
                      className="text-contrast-foreground"
                      icon={X}
                      size={12}
                    />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {(audioMedia.length > 0 || pendingAudio.length > 0) && (
        <View className="border-border-secondary gap-2 border-t p-4">
          {audioMedia.map((clip) => (
            <View className="w-full flex-row items-center gap-2" key={clip.id}>
              <View className="flex-1">
                <AudioPlayer uri={clip.uri} duration={clip.duration!} />
              </View>
              <Button
                className="size-6 rounded-full"
                onPress={() => onDeleteMedia(clip.id)}
                size="icon"
                variant="link"
              >
                <Icon className="text-muted-foreground" icon={X} />
              </Button>
            </View>
          ))}
          {pendingAudio.map((clip) => (
            <View className="w-full flex-row items-center gap-2" key={clip.id}>
              <View className="bg-card flex-1 rounded-lg px-3 py-2">
                <Text numberOfLines={1}>
                  {clip.fileName?.trim() || 'Audio file'}
                </Text>
              </View>
              <View className="w-8 items-center justify-center">
                <Spinner size="small" style={{ transform: [{ scale: 0.8 }] }} />
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
};
