import { useFilteredMedia } from '@/features/media/hooks/use-filtered-media';
import { clipboardToAssets } from '@/features/media/lib/clipboard-to-assets';
import * as mediaUtils from '@/features/media/lib/media';
import * as pickedMedia from '@/features/media/lib/picked-media';
import * as mediaComposer from '@/features/media/types/media-composer.types';
import { alert } from '@/lib/alert';
import { id } from '@instantdb/react-native';
import { getDocumentAsync } from 'expo-document-picker';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';
import * as React from 'react';
import { Platform } from 'react-native';

interface PendingDeletion {
  requestId: number;
}

type UseMediaComposerStateOptions = Pick<
  mediaComposer.UseMediaComposerOptions,
  'isOpen' | 'media' | 'onDeleteMedia' | 'onUploadMedia'
> & {
  scopeKey: string;
};

export const useMediaComposerState = ({
  isOpen,
  media,
  onDeleteMedia,
  onUploadMedia,
  scopeKey,
}: UseMediaComposerStateOptions) => {
  const [isDeleteTransitioning, startDeleteTransition] = React.useTransition();
  const nextDeleteRequestIdRef = React.useRef(0);

  const [pendingUploads, setPendingUploads] = React.useState<
    mediaComposer.PendingUpload[]
  >([]);

  const [pendingDeletions, setPendingDeletions] = React.useState<
    Record<string, PendingDeletion>
  >({});

  const [localPreviewUris, setLocalPreviewUris] = React.useState<
    Record<string, string>
  >({});

  React.useEffect(() => {
    setPendingDeletions({});
  }, [scopeKey]);

  const visibleMedia = React.useMemo(
    () => media.filter((item) => !pendingDeletions[item.id]),
    [media, pendingDeletions]
  );

  const { audioMedia, visualMedia } = useFilteredMedia(visibleMedia);

  const pendingAudioCount = React.useMemo(
    () => pendingUploads.filter(mediaComposer.isPendingAudioUpload).length,
    [pendingUploads]
  );

  const canAddAudio =
    audioMedia.length + pendingAudioCount < mediaComposer.MAX_AUDIO_ATTACHMENTS;

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
        mediaComposer.MAX_AUDIO_ATTACHMENTS -
          audioMedia.length -
          pendingAudioCount
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
            message: `You can attach up to ${mediaComposer.MAX_AUDIO_ATTACHMENTS} audio files.`,
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
            await onUploadMedia(asset, mediaId, order);
          } catch (error) {
            setPendingUploads((prev) =>
              prev.filter((item) => item.id !== mediaId)
            );

            removeLocalPreviewUri(mediaId);

            alert({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to upload media.',
              title: 'Upload failed',
            });
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

    const handler = async (event: ClipboardEvent) => {
      if (!event.clipboardData?.items.length) return;
      const assets = await clipboardToAssets(event.clipboardData.items);
      if (!assets.length) return;
      event.preventDefault();
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
          .filter((item) => !mediaUtils.isVideoMediaProcessing(item))
          .map((item) => item.id)
      );

      const next = prev.filter((item) => !mediaIds.has(item.id));
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
    () => new Set(pendingUploads.map((item) => item.id)),
    [pendingUploads]
  );

  const realMediaById = React.useMemo(
    () => new Map(visualMedia.map((item) => [item.id, item])),
    [visualMedia]
  );

  const allVisual = React.useMemo(
    (): mediaComposer.VisualPreviewItem[] =>
      [
        ...visualMedia
          .filter((item) => !pendingIdSet.has(item.id))
          .map((item) => ({
            ...item,
            pending: false,
            localUri: localPreviewUris[item.id],
            type: mediaComposer.toVisualMediaType(item.type),
          })),
        ...pendingUploads
          .filter(mediaComposer.isVisualPendingUpload)
          .map((item) => {
            const real = realMediaById.get(item.id);

            if (real && !mediaUtils.isVideoMediaProcessing(real)) {
              return {
                ...real,
                height: item.height,
                order: item.order,
                pending: false,
                localUri: localPreviewUris[item.id] ?? item.uri,
                type: mediaComposer.toVisualMediaType(real.type),
                width: item.width,
              };
            }

            return {
              height: item.height,
              id: item.id,
              order: item.order,
              uri: item.uri,
              type: item.type,
              pending: true,
              localUri: localPreviewUris[item.id] ?? item.uri,
              width: item.width,
            };
          }),
      ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [localPreviewUris, pendingIdSet, pendingUploads, realMediaById, visualMedia]
  );

  const pendingAudio = React.useMemo(
    (): mediaComposer.PendingAudioUpload[] =>
      pendingUploads
        .filter(mediaComposer.isPendingAudioUpload)
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

  return {
    allVisual,
    audioMedia,
    autoPlayPendingVideoId,
    canAddAudio,
    handleBrowseMedia,
    handleCaptureMedia,
    handleDeleteMedia,
    handlePickFiles,
    isBusy: pendingUploads.length > 0 || isDeleteTransitioning,
    mediaCount: audioMedia.length + pendingAudio.length + allVisual.length,
    pendingAudio,
    removeLocalPreviewUri,
  };
};
