import { AudioPlayer } from '@/components/ui/audio-player';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VideoPlayer } from '@/components/ui/video-player';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFilteredMedia } from '@/hooks/use-filtered-media';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { UI } from '@/theme/ui';
import { Media } from '@/types/media';
import { alert } from '@/utilities/alert';
import { clipboardToAssets } from '@/utilities/clipboard-to-assets';
import { fileUriToSrc, useFileAccessToken } from '@/utilities/file-uri-to-src';
import { id } from '@instantdb/react-native';
import { Image as ImagePrimitive } from 'expo-image';
import {
  ImagePickerAsset,
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera } from 'phosphor-react-native/lib/module/icons/Camera';
import { Microphone } from 'phosphor-react-native/lib/module/icons/Microphone';
import { Play } from 'phosphor-react-native/lib/module/icons/Play';
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

interface PendingDeletion {
  requestId: number;
}

interface VisualPreviewItem {
  id: string;
  localUri?: string;
  order?: number;
  pending: boolean;
  previewUri?: string;
  progress: number;
  type: 'image' | 'video';
  uri: string;
}

interface UseMediaComposerOptions {
  replyId?: string;
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

const SHEET_MEDIA_PREVIEW_SIZE = 64;
const MAX_AUDIO_ATTACHMENTS = 3;

const SheetVisualPreviewImage = ({
  fileAccessToken,
  foregroundColor,
  item,
  onRemoteReady,
}: {
  fileAccessToken: ReturnType<typeof useFileAccessToken>;
  foregroundColor: string;
  item: VisualPreviewItem;
  onRemoteReady: (mediaId: string) => void;
}) => {
  const remoteSrc = React.useMemo(
    () =>
      fileUriToSrc(
        item.type === 'video' ? item.previewUri || item.uri : item.uri,
        fileAccessToken
      ),
    [fileAccessToken, item.previewUri, item.type, item.uri]
  );

  const [isRemoteReady, setIsRemoteReady] = React.useState(false);
  const shouldHoldLocalPreview = item.type === 'image' && !!item.localUri;
  const showRemoteLoadingIndicator = !isRemoteReady && !shouldHoldLocalPreview;

  const imageStyle = { height: '100%', width: '100%' } as const;

  React.useEffect(() => {
    setIsRemoteReady(false);
  }, [item.id, remoteSrc]);

  const handleRemoteReady = React.useCallback(() => {
    setIsRemoteReady(true);
    if (shouldHoldLocalPreview) onRemoteReady(item.id);
  }, [item.id, onRemoteReady, shouldHoldLocalPreview]);

  return (
    <View className="relative flex-1 bg-card">
      {shouldHoldLocalPreview && (
        <ImagePrimitive
          contentFit="cover"
          contentPosition="center"
          source={{ uri: item.localUri }}
          style={imageStyle}
        />
      )}
      <ImagePrimitive
        contentFit="cover"
        contentPosition="center"
        onDisplay={handleRemoteReady}
        onLoad={handleRemoteReady}
        source={{ uri: remoteSrc }}
        style={{
          ...imageStyle,
          opacity: shouldHoldLocalPreview && !isRemoteReady ? 0 : 1,
        }}
      />
      {showRemoteLoadingIndicator && (
        <View
          style={{
            alignItems: 'center',
            bottom: 0,
            justifyContent: 'center',
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        >
          <ActivityIndicator size="small" color={foregroundColor} />
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
  const colorScheme = useColorScheme();
  const foregroundColor = UI[colorScheme].foreground;
  const fileAccessToken = useFileAccessToken();
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
  const canAddAudio = audioMedia.length < MAX_AUDIO_ATTACHMENTS;

  const removeLocalPreviewUri = React.useCallback((mediaId: string) => {
    setLocalPreviewUris((prev) => {
      if (!(mediaId in prev)) return prev;
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });
  }, []);

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

      setLocalPreviewUris((prev) => ({
        ...prev,
        ...Object.fromEntries(
          mediaIds.map((mediaId, i) => [mediaId, assets[i].uri])
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
    [media.length, onUploadMedia, removeLocalPreviewUri]
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
    uploadAssets(picker.assets);
  }, [ensureMediaLibraryPermission, uploadAssets]);

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
    uploadAssets(picker.assets);
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
      const mediaIds = new Set(visualMedia.map((m) => m.id));
      const next = prev.filter((p) => !mediaIds.has(p.id));
      return next.length === prev.length ? prev : next;
    });
  }, [visualMedia]);

  React.useEffect(() => {
    setLocalPreviewUris((prev) => {
      const activeIds = new Set([
        ...visualMedia.map((item) => item.id),
        ...pendingUploads.map((item) => item.id),
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
            type: item.type as 'image' | 'video',
          })),
        ...pendingUploads.map((p) => {
          const real = realMediaById.get(p.id);
          if (real)
            return {
              ...real,
              order: p.order,
              pending: false,
              progress: 100,
              localUri: localPreviewUris[p.id] ?? p.uri,
              type: real.type as 'image' | 'video',
            };

          return {
            id: p.id,
            order: p.order,
            uri: p.uri,
            type: p.type,
            pending: true,
            progress: p.progress,
            localUri: localPreviewUris[p.id] ?? p.uri,
          };
        }),
      ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [visualMedia, pendingUploads, pendingIdSet, realMediaById, localPreviewUris]
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
          className="shrink-0 border-t border-border-secondary"
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
                      ? 'flex-1 cursor-default overflow-hidden rounded-lg bg-border'
                      : 'flex-1 overflow-hidden rounded-lg bg-border'
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
                    <View className="flex-1 bg-card">
                      {item.type === 'video' ? (
                        <VideoPlayer
                          autoPlay={item.id === autoPlayPendingVideoId}
                          contentFit="cover"
                          maxHeight={SHEET_MEDIA_PREVIEW_SIZE}
                          maxWidth={SHEET_MEDIA_PREVIEW_SIZE}
                          muted
                          uri={item.localUri ?? item.uri}
                        />
                      ) : (
                        <ImagePrimitive
                          contentFit="cover"
                          contentPosition="center"
                          source={{ uri: item.uri }}
                          style={{ height: '100%', width: '100%' }}
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
                          bottom: 0,
                          justifyContent: 'center',
                          left: 0,
                          position: 'absolute',
                          right: 0,
                          top: 0,
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
                    <SheetVisualPreviewImage
                      fileAccessToken={fileAccessToken}
                      foregroundColor={foregroundColor}
                      item={item}
                      onRemoteReady={removeLocalPreviewUri}
                    />
                  )}
                </Pressable>
                {item.type === 'video' && !item.pending && (
                  <View
                    className="absolute items-center justify-center rounded-full"
                    pointerEvents="none"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      borderCurve: 'continuous',
                      borderRadius: 999,
                      bottom: 4,
                      height: 20,
                      left: 4,
                      width: 20,
                      zIndex: 5,
                    }}
                  >
                    <Icon
                      className="text-white"
                      icon={Play}
                      size={10}
                      weight="fill"
                    />
                  </View>
                )}
                {!item.pending && (
                  <Pressable
                    className="items-center justify-center rounded-full"
                    onPress={() => handleDeleteMedia(item.id)}
                    style={{
                      borderCurve: 'continuous',
                      borderRadius: 999,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      height: 20,
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      width: 20,
                      zIndex: 6,
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
        </View>
      )}
    </>
  );

  const toolbar = (
    <>
      <Button
        className="size-8"
        onPress={handleBrowseMedia}
        size="icon"
        variant="secondary"
      >
        <Icon icon={Plus} />
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
    mediaCount: audioMedia.length + allVisual.length,
    mediaPreview,
    toolbar,
  };
};
