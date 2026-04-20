import { AudioPlayer } from '@/components/ui/audio-player';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VideoPlayer } from '@/components/ui/video-player';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Media } from '@/types/media';
import { alert } from '@/utilities/alert';
import { clipboardToAssets } from '@/utilities/clipboard-to-assets';
import { useFileUriToSrc } from '@/utilities/file-uri-to-src';
import * as m from '@/utilities/media';
import * as pickedMedia from '@/utilities/picked-media';
import { id } from '@instantdb/react-native';
import { getDocumentAsync } from 'expo-document-picker';
import { Image as ImagePrimitive } from 'expo-image';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera } from 'phosphor-react-native/lib/module/icons/Camera';
import { ImageSquare } from 'phosphor-react-native/lib/module/icons/ImageSquare';
import { Microphone } from 'phosphor-react-native/lib/module/icons/Microphone';
import { Paperclip } from 'phosphor-react-native/lib/module/icons/Paperclip';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
import { X } from 'phosphor-react-native/lib/module/icons/X';
import * as React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

interface PendingUpload {
  fileName?: string;
  height?: number;
  id: string;
  order: number;
  progress: number;
  type: pickedMedia.PickedMediaAsset['type'];
  uri: string;
  width?: number;
}

const isVisualPendingUpload = (
  item: PendingUpload
): item is PendingUpload & { type: 'image' | 'video' } =>
  item.type === 'image' || item.type === 'video';

interface PendingDeletion {
  requestId: number;
}

interface VisualPreviewItem {
  height?: number;
  id: string;
  localUri?: string;
  order?: number;
  pending: boolean;
  progress: number;
  type: 'image' | 'video';
  uri: string;
  width?: number;
}

const toVisualMediaType = (type?: string | null): VisualPreviewItem['type'] =>
  type === 'video' ? 'video' : 'image';

interface UseMediaComposerOptions {
  replyId?: string;
  isOpen: boolean;
  media: Media[];
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onOpenAudio: () => void;
  onUploadMedia: (
    asset: pickedMedia.PickedMediaAsset,
    onProgress: (progress: number) => void,
    mediaId: string,
    order: number
  ) => Promise<void>;
  recordId?: string;
}

const SHEET_MEDIA_PREVIEW_SIZE = 64;
const SHEET_PENDING_VIDEO_OVERFLOW = 16;
const MAX_AUDIO_ATTACHMENTS = 3;

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
  item: VisualPreviewItem;
  onRemoteReady: (mediaId: string) => void;
}) => {
  const remoteSrc = useFileUriToSrc(m.getVisualMediaThumbnailUri(item));
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

export const useMediaComposer = ({
  replyId,
  isOpen,
  media,
  onDeleteMedia,
  onOpenAudio,
  onUploadMedia,
  recordId,
}: UseMediaComposerOptions) => {
  const { suspend } = useSheetManager();
  const [isDeleteTransitioning, startDeleteTransition] = React.useTransition();
  const nextDeleteRequestIdRef = React.useRef(0);

  const [pendingUploads, setPendingUploads] = React.useState<PendingUpload[]>(
    []
  );

  const [pendingDeletions, setPendingDeletions] = React.useState<
    Record<string, PendingDeletion>
  >({});

  const [localPreviewUris, setLocalPreviewUris] = React.useState<
    Record<string, string>
  >({});

  const deleteScopeKey = `${recordId ?? ''}:${replyId ?? ''}`;

  React.useEffect(() => {
    setPendingDeletions({});
  }, [deleteScopeKey]);

  const visibleMedia = React.useMemo(
    () => media.filter((item) => !pendingDeletions[item.id]),
    [media, pendingDeletions]
  );

  const { audioMedia, visualMedia } = useFilteredMedia(visibleMedia);

  const pendingAudioCount = React.useMemo(
    () => pendingUploads.filter((item) => item.type === 'audio').length,
    [pendingUploads]
  );

  const canAddAudio =
    audioMedia.length + pendingAudioCount < MAX_AUDIO_ATTACHMENTS;

  const removeLocalPreviewUri = React.useCallback((mediaId: string) => {
    setLocalPreviewUris((prev) => {
      if (!(mediaId in prev)) return prev;
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });
  }, []);

  const uploadAssets = React.useCallback(
    (inputAssets: pickedMedia.PickedMediaAsset[]) => {
      const availableAudioSlots = Math.max(
        0,
        MAX_AUDIO_ATTACHMENTS - audioMedia.length - pendingAudioCount
      );

      let remainingAudioSlots = availableAudioSlots;

      const assets = inputAssets.filter((asset) => {
        if (asset.type !== 'audio') return true;
        if (remainingAudioSlots <= 0) return false;
        remainingAudioSlots -= 1;
        return true;
      });

      if (!assets.length) {
        if (inputAssets.some((asset) => asset.type === 'audio')) {
          alert({
            message: `You can attach up to ${MAX_AUDIO_ATTACHMENTS} audio files.`,
            title: 'Audio limit reached',
          });
        }

        return;
      }

      if (assets.length < inputAssets.length) {
        alert({
          message: `Only ${availableAudioSlots} more audio file${
            availableAudioSlots === 1 ? '' : 's'
          } could be added.`,
          title: 'Audio limit reached',
        });
      }

      const mediaIds = assets.map(() => id());
      const baseOrder = media.length + pendingUploads.length;

      setPendingUploads((prev) => [
        ...prev,
        ...assets.map((asset, i) => ({
          fileName: asset.fileName ?? undefined,
          height: asset.height,
          id: mediaIds[i],
          order: baseOrder + i,
          progress: 0,
          type: asset.type,
          uri: asset.uri,
          width: asset.width,
        })),
      ]);

      setLocalPreviewUris((prev) => ({
        ...prev,
        ...Object.fromEntries(
          assets.flatMap((asset, i) =>
            pickedMedia.isVisualPickedMedia(asset)
              ? [[mediaIds[i], asset.uri]]
              : []
          )
        ),
      }));

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
            removeLocalPreviewUri(mediaId);
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
    [
      audioMedia.length,
      media.length,
      onUploadMedia,
      pendingAudioCount,
      pendingUploads.length,
      removeLocalPreviewUri,
    ]
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
  }, [isOpen, uploadAssets]);

  const showCapturePermissionAlert = React.useCallback(
    ({
      needsCamera,
      needsLibrary,
    }: {
      needsCamera: boolean;
      needsLibrary: boolean;
    }) => {
      const title =
        needsCamera && needsLibrary
          ? 'Camera and photo library'
          : needsCamera
            ? 'Camera'
            : 'Photo library';

      const message =
        needsCamera && needsLibrary
          ? 'Allow access to take photos and videos.'
          : needsCamera
            ? 'Allow access to take photos and videos.'
            : 'Allow access to save photos and videos.';

      alert({
        message,
        title,
      });
    },
    []
  );

  const ensureMediaLibraryPermission = React.useCallback(async () => {
    const permission = await requestMediaLibraryPermissionsAsync();
    if (permission.granted) return true;

    alert({
      message: 'Allow access to add photos and videos.',
      title: 'Photo library',
    });

    return false;
  }, []);

  const handleBrowseMedia = React.useCallback(async () => {
    const hasPermission = await ensureMediaLibraryPermission();
    if (!hasPermission) return;

    const picker = await launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: false,
      mediaTypes: ['images', 'videos'],
      orderedSelection: true,
    });

    if (picker.canceled) return;

    uploadAssets(
      picker.assets
        .map((asset) => pickedMedia.normalizeImagePickerAsset(asset))
        .filter((asset): asset is pickedMedia.PickedMediaAsset => !!asset)
    );
  }, [ensureMediaLibraryPermission, uploadAssets]);

  const handlePickFiles = React.useCallback(async () => {
    const picker = await getDocumentAsync({
      base64: false,
      copyToCacheDirectory: true,
      multiple: true,
      type: pickedMedia.FILE_PICKER_MIME_TYPES,
    });

    if (picker.canceled) return;

    const assets = (picker.assets ?? [])
      .map((asset) => pickedMedia.normalizeDocumentPickerAsset(asset))
      .filter((asset): asset is pickedMedia.PickedMediaAsset => !!asset);

    if (!assets.length) {
      alert({
        message: 'Choose an image, video, or audio file.',
        title: 'Unsupported file',
      });
      return;
    }

    uploadAssets(assets);
  }, [uploadAssets]);

  const handleCaptureMedia = React.useCallback(async () => {
    const [cameraPermission, libraryPermission] = await Promise.all([
      requestCameraPermissionsAsync(),
      requestMediaLibraryPermissionsAsync(),
    ]);

    if (!cameraPermission.granted || !libraryPermission.granted) {
      showCapturePermissionAlert({
        needsCamera: !cameraPermission.granted,
        needsLibrary: !libraryPermission.granted,
      });
      return;
    }

    const picker = await launchCameraAsync({
      exif: false,
      mediaTypes: ['images', 'videos'],
    });

    if (picker.canceled) return;
    uploadAssets(
      picker.assets
        .map((asset) => pickedMedia.normalizeImagePickerAsset(asset))
        .filter((asset): asset is pickedMedia.PickedMediaAsset => !!asset)
    );
  }, [showCapturePermissionAlert, uploadAssets]);

  const handleDeleteMedia = React.useCallback(
    (mediaId: string) => {
      const requestId = ++nextDeleteRequestIdRef.current;
      removeLocalPreviewUri(mediaId);

      setPendingDeletions((current) => ({
        ...current,
        [mediaId]: { requestId },
      }));

      startDeleteTransition(() => {
        void onDeleteMedia(mediaId).catch(() => {
          setPendingDeletions((current) => {
            const entry = current[mediaId];
            if (!entry || entry.requestId !== requestId) return current;
            const next = { ...current };
            delete next[mediaId];
            return next;
          });
        });
      });
    },
    [onDeleteMedia, removeLocalPreviewUri, startDeleteTransition]
  );

  React.useEffect(() => {
    setPendingDeletions((current) => {
      let didChange = false;
      const mediaIds = new Set(media.map((item) => item.id));
      const next = { ...current };

      for (const mediaId of Object.keys(current)) {
        if (!mediaIds.has(mediaId)) {
          delete next[mediaId];
          didChange = true;
        }
      }

      return didChange ? next : current;
    });
  }, [media]);

  React.useEffect(() => {
    setPendingUploads((prev) => {
      if (!prev.length) return prev;

      const mediaIds = new Set(
        visibleMedia
          .filter((item) => !m.isVideoMediaProcessing(item))
          .map((item) => item.id)
      );

      const next = prev.filter((p) => !mediaIds.has(p.id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleMedia]);

  React.useEffect(() => {
    setLocalPreviewUris((prev) => {
      const activeIds = new Set([
        ...visualMedia.map((item) => item.id),
        ...pendingUploads
          .filter((item) => item.type !== 'audio')
          .map((item) => item.id),
      ]);

      let changed = false;
      const next: Record<string, string> = {};

      Object.entries(prev).forEach(([mediaId, uri]) => {
        if (activeIds.has(mediaId)) {
          next[mediaId] = uri;
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [pendingUploads, visualMedia]);

  const pendingIdSet = React.useMemo(
    () => new Set(pendingUploads.map((p) => p.id)),
    [pendingUploads]
  );

  const realMediaById = React.useMemo(
    () => new Map(visualMedia.map((m) => [m.id, m])),
    [visualMedia]
  );

  const allVisual = React.useMemo(
    (): VisualPreviewItem[] =>
      [
        ...visualMedia
          .filter((m) => !pendingIdSet.has(m.id))
          .map((item) => ({
            ...item,
            pending: false,
            progress: 100,
            localUri: localPreviewUris[item.id],
            type: toVisualMediaType(item.type),
          })),
        ...pendingUploads
          .filter((item) => isVisualPendingUpload(item))
          .map((p) => {
            const real = realMediaById.get(p.id);

            if (real && !m.isVideoMediaProcessing(real))
              return {
                ...real,
                height: p.height,
                order: p.order,
                pending: false,
                progress: 100,
                localUri: localPreviewUris[p.id] ?? p.uri,
                type: toVisualMediaType(real.type),
                width: p.width,
              };

            return {
              height: p.height,
              id: p.id,
              order: p.order,
              uri: p.uri,
              type: p.type,
              pending: true,
              progress: p.progress,
              localUri: localPreviewUris[p.id] ?? p.uri,
              width: p.width,
            };
          }),
      ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [visualMedia, pendingUploads, pendingIdSet, realMediaById, localPreviewUris]
  );

  const pendingAudio = React.useMemo(
    () =>
      pendingUploads
        .filter((item) => item.type === 'audio')
        .sort((a, b) => a.order - b.order),
    [pendingUploads]
  );

  const autoPlayPendingVideoId = React.useMemo(
    () =>
      [...pendingUploads]
        .reverse()
        .find(
          (item) =>
            item.type === 'video' && (localPreviewUris[item.id] ?? item.uri)
        )?.id,
    [localPreviewUris, pendingUploads]
  );

  const mediaPreview = (
    <>
      {!!allVisual.length && (
        <ScrollView
          className="border-border-secondary shrink-0 border-t"
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={{ borderCurve: 'continuous' }}
        >
          <View className="flex-row gap-3 p-4">
            {allVisual.map((item) => (
              <View className="relative size-16" key={item.id}>
                <Pressable
                  className={
                    item.pending
                      ? 'bg-border flex-1 cursor-default overflow-hidden rounded-lg'
                      : 'bg-border flex-1 overflow-hidden rounded-lg'
                  }
                  onPress={() => {
                    if (!item.pending && recordId) {
                      suspend();

                      router.push({
                        pathname: '/record/[recordId]/media',
                        params: {
                          recordId,
                          ...(replyId && { replyId }),
                          id: item.id,
                        },
                      });
                    }
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
                      <View className="absolute inset-0 z-[4] items-center justify-center">
                        {item.progress > 0 && item.progress < 100 ? (
                          <Text className="text-white">{item.progress}</Text>
                        ) : (
                          <Spinner
                            size="small"
                            style={{ transform: [{ scale: 0.8 }] }}
                          />
                        )}
                      </View>
                    </View>
                  ) : (
                    <SheetVisualPreviewImage
                      item={item}
                      onRemoteReady={removeLocalPreviewUri}
                    />
                  )}
                </Pressable>
                {item.type === 'video' &&
                  !item.pending &&
                  !m.isVideoMediaProcessing(item) && (
                    <View className="pointer-events-none absolute bottom-0 left-0 z-10 size-6 items-center justify-center">
                      <Icon className="text-white" icon={Play} size={12} />
                    </View>
                  )}
                {!item.pending && (
                  <Pressable
                    className="absolute top-0 right-0 z-20 size-6 items-center justify-center"
                    onPress={() => handleDeleteMedia(item.id)}
                  >
                    <Icon className="text-white" icon={X} size={12} />
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
                onPress={() => handleDeleteMedia(clip.id)}
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
                {clip.progress > 0 && clip.progress < 100 ? (
                  <Text className="text-muted-foreground">{clip.progress}</Text>
                ) : (
                  <Spinner
                    size="small"
                    style={{ transform: [{ scale: 0.8 }] }}
                  />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  const toolbar =
    Platform.OS === 'web' ? (
      <>
        <Button
          className="size-8"
          onPress={handlePickFiles}
          size="icon"
          variant="secondary"
        >
          <Icon icon={Plus} />
        </Button>
        <Button
          className="size-8"
          disabled={!canAddAudio}
          onPress={onOpenAudio}
          size="icon"
          variant="secondary"
        >
          <Icon icon={Microphone} />
        </Button>
      </>
    ) : (
      <>
        <Button
          className="size-8"
          onPress={handlePickFiles}
          size="icon"
          variant="secondary"
        >
          <Icon icon={Paperclip} />
        </Button>
        <Button
          className="size-8"
          onPress={handleBrowseMedia}
          size="icon"
          variant="secondary"
        >
          <Icon icon={ImageSquare} />
        </Button>
        {Platform.OS === 'ios' && (
          <Button
            className="size-8"
            onPress={handleCaptureMedia}
            size="icon"
            variant="secondary"
          >
            <Icon icon={Camera} />
          </Button>
        )}
        <Button
          className="size-8"
          disabled={!canAddAudio}
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
    mediaCount: audioMedia.length + pendingAudio.length + allVisual.length,
    mediaPreview,
    toolbar,
  };
};
