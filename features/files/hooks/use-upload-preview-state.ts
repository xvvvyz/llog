import { getFileSourceUri } from '@/features/files/lib/file-uri-to-src';
import * as pickedFiles from '@/features/files/lib/picked';
import * as visualMedia from '@/features/files/lib/visual-media';
import * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import { alert } from '@/lib/alert';
import { id } from '@instantdb/react-native';
import * as React from 'react';

export const useFileUploadPreviewState = ({
  fileCount,
  onUploadFile,
  scopeKey,
  visibleFiles,
  visualMedia: visualItems,
}: Pick<fileComposer.UseFileComposerOptions, 'onUploadFile'> & {
  fileCount: number;
  scopeKey: string;
  visibleFiles: FileItem[];
  visualMedia: FileItem[];
}) => {
  const [pendingUploads, setPendingUploads] = React.useState<
    fileComposer.PendingUpload[]
  >([]);

  const [localPreviewUris, setLocalPreviewUris] = React.useState<
    Record<string, string>
  >({});

  const [focusedAudioId, setFocusedAudioId] = React.useState<string | null>(
    null
  );

  const removeLocalPreviewUri = React.useCallback((fileId: string) => {
    setLocalPreviewUris((prev) => {
      if (!(fileId in prev)) return prev;
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }, []);

  const clearFocusedAudioId = React.useCallback((fileId: string) => {
    setFocusedAudioId((current) => (current === fileId ? null : current));
  }, []);

  React.useEffect(() => {
    setPendingUploads([]);
    setLocalPreviewUris({});
    setFocusedAudioId(null);
  }, [scopeKey]);

  const uploadAssets = React.useCallback(
    (inputAssets: pickedFiles.PickedFileAsset[]) => {
      const assets = inputAssets;
      if (!assets.length) return;
      const fileIds = assets.map(() => id());
      const baseOrder = fileCount + pendingUploads.length;
      let focusedAudioIndex = -1;

      for (let i = assets.length - 1; i >= 0; i -= 1) {
        if (assets[i].type !== 'audio') continue;
        focusedAudioIndex = i;
        break;
      }

      if (focusedAudioIndex >= 0) setFocusedAudioId(fileIds[focusedAudioIndex]);

      setPendingUploads((prev) => [
        ...prev,
        ...assets.map((asset, i) => ({
          height: asset.height,
          id: fileIds[i],
          mimeType: asset.mimeType ?? undefined,
          name: asset.fileName ?? undefined,
          order: baseOrder + i,
          size: asset.size ?? undefined,
          type: asset.type,
          uri: asset.uri,
          width: asset.width,
        })),
      ]);

      setLocalPreviewUris((prev) => ({
        ...prev,
        ...Object.fromEntries(
          assets.flatMap((asset, i) =>
            pickedFiles.isVisualPickedFile(asset)
              ? [[fileIds[i], asset.uri]]
              : []
          )
        ),
      }));

      const concurrency = 2;

      const queue = assets.map((asset, i) => ({
        asset,
        fileId: fileIds[i],
        order: baseOrder + i,
      }));

      const run = async (items: typeof queue) => {
        for (const { asset, fileId, order } of items) {
          try {
            await onUploadFile(asset, fileId, order);
          } catch (error) {
            setPendingUploads((prev) =>
              prev.filter((item) => item.id !== fileId)
            );

            removeLocalPreviewUri(fileId);
            clearFocusedAudioId(fileId);

            alert({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to upload files.',
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
      clearFocusedAudioId,
      fileCount,
      onUploadFile,
      pendingUploads.length,
      removeLocalPreviewUri,
    ]
  );

  React.useEffect(() => {
    setPendingUploads((prev) => {
      if (!prev.length) return prev;

      const fileIds = new Set(
        visibleFiles
          .filter((item) => !visualMedia.isProcessing(item))
          .map((item) => item.id)
      );

      const next = prev.filter((item) => !fileIds.has(item.id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleFiles]);

  React.useEffect(() => {
    setLocalPreviewUris((prev) => {
      const activeIds = new Set([
        ...visualItems.map((item) => item.id),
        ...pendingUploads
          .filter(fileComposer.isVisualPendingUpload)
          .map((item) => item.id),
      ]);

      let changed = false;
      const next: Record<string, string> = {};

      Object.entries(prev).forEach(([fileId, uri]) => {
        if (activeIds.has(fileId)) {
          next[fileId] = uri;
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

  const realFileById = React.useMemo(
    () => new Map(visualItems.map((item) => [item.id, item])),
    [visualItems]
  );

  const allVisual = React.useMemo(
    (): fileComposer.VisualPreviewItem[] =>
      [
        ...visualItems
          .filter((item) => !pendingIdSet.has(item.id))
          .map((item) => ({
            ...item,
            localUri: localPreviewUris[item.id],
            pending: false,
            type: fileComposer.toVisualFileType(item.type),
            uri: getFileSourceUri(item),
          })),
        ...pendingUploads
          .filter(fileComposer.isVisualPendingUpload)
          .map((item) => {
            const real = realFileById.get(item.id);

            if (real && !visualMedia.isProcessing(real)) {
              return {
                ...real,
                height: item.height,
                localUri: localPreviewUris[item.id] ?? item.uri,
                order: item.order,
                pending: false,
                type: fileComposer.toVisualFileType(real.type),
                uri: getFileSourceUri(real),
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
    [localPreviewUris, pendingIdSet, pendingUploads, realFileById, visualItems]
  );

  const pendingAudio = React.useMemo(
    (): fileComposer.PendingAudioUpload[] =>
      pendingUploads
        .filter(fileComposer.isPendingAudioUpload)
        .sort((a, b) => a.order - b.order),
    [pendingUploads]
  );

  const pendingDocuments = React.useMemo(
    (): fileComposer.PendingDocumentUpload[] =>
      pendingUploads
        .filter(fileComposer.isPendingDocumentUpload)
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
    clearFocusedAudioId,
    focusedAudioId,
    pendingAudio,
    pendingDocuments,
    pendingUploads,
    removeLocalPreviewUri,
    uploadAssets,
  };
};
