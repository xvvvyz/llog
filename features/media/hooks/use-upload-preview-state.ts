import * as pickedMedia from '@/features/media/lib/picked';
import * as visualMedia from '@/features/media/lib/visual-media';
import * as mediaComposer from '@/features/media/types/composer';
import type { Media } from '@/features/media/types/media';
import { alert } from '@/lib/alert';
import { id } from '@instantdb/react-native';
import * as React from 'react';

export const useMediaUploadPreviewState = ({
  mediaCount,
  onUploadMedia,
  visibleMedia,
  visualMedia: visualItems,
}: Pick<mediaComposer.UseMediaComposerOptions, 'onUploadMedia'> & {
  mediaCount: number;
  visibleMedia: Media[];
  visualMedia: Media[];
}) => {
  const [pendingUploads, setPendingUploads] = React.useState<
    mediaComposer.PendingUpload[]
  >([]);

  const [localPreviewUris, setLocalPreviewUris] = React.useState<
    Record<string, string>
  >({});

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
      const assets = inputAssets;
      if (!assets.length) return;
      const mediaIds = assets.map(() => id());
      const baseOrder = mediaCount + pendingUploads.length;

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
    [mediaCount, onUploadMedia, pendingUploads.length, removeLocalPreviewUri]
  );

  React.useEffect(() => {
    setPendingUploads((prev) => {
      if (!prev.length) return prev;

      const mediaIds = new Set(
        visibleMedia
          .filter((item) => !visualMedia.isProcessing(item))
          .map((item) => item.id)
      );

      const next = prev.filter((item) => !mediaIds.has(item.id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleMedia]);

  React.useEffect(() => {
    setLocalPreviewUris((prev) => {
      const activeIds = new Set([
        ...visualItems.map((item) => item.id),
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
  }, [pendingUploads, visualItems]);

  const pendingIdSet = React.useMemo(
    () => new Set(pendingUploads.map((item) => item.id)),
    [pendingUploads]
  );

  const realMediaById = React.useMemo(
    () => new Map(visualItems.map((item) => [item.id, item])),
    [visualItems]
  );

  const allVisual = React.useMemo(
    (): mediaComposer.VisualPreviewItem[] =>
      [
        ...visualItems
          .filter((item) => !pendingIdSet.has(item.id))
          .map((item) => ({
            ...item,
            localUri: localPreviewUris[item.id],
            pending: false,
            type: mediaComposer.toVisualMediaType(item.type),
          })),
        ...pendingUploads
          .filter(mediaComposer.isVisualPendingUpload)
          .map((item) => {
            const real = realMediaById.get(item.id);

            if (real && !visualMedia.isProcessing(real)) {
              return {
                ...real,
                height: item.height,
                localUri: localPreviewUris[item.id] ?? item.uri,
                order: item.order,
                pending: false,
                type: mediaComposer.toVisualMediaType(real.type),
                width: item.width,
              };
            }

            return {
              height: item.height,
              id: item.id,
              localUri: localPreviewUris[item.id] ?? item.uri,
              order: item.order,
              pending: true,
              type: item.type,
              uri: item.uri,
              width: item.width,
            };
          }),
      ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [localPreviewUris, pendingIdSet, pendingUploads, realMediaById, visualItems]
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
    autoPlayPendingVideoId,
    pendingAudio,
    pendingUploads,
    removeLocalPreviewUri,
    uploadAssets,
  };
};
