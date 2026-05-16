import { getFileSourceUri } from '@/features/files/lib/file-uri-to-src';
import * as pickedFiles from '@/features/files/lib/picked';
import * as queuedAttachmentUtils from '@/features/files/lib/queued-attachments';
import * as visualMedia from '@/features/files/lib/visual-media';
import * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import * as outbox from '@/features/offline/outbox-hooks';
import * as outboxSyncCore from '@/features/offline/outbox-sync-core';
import type { QueuedAttachment, QueuedParent } from '@/features/offline/types';
import { id } from '@instantdb/react-native';
import * as React from 'react';
import * as existingUpload from '@/features/files/lib/existing-upload';

export const useFileUploadPreviewState = ({
  actionsDisabled,
  deferQueuedUploads,
  onUploadFile,
  parent,
  queuedAttachmentsForParent,
  scopeKey,
  visibleFiles,
  visualMedia: visualItems,
}: Pick<
  fileComposer.UseFileComposerOptions,
  'deferQueuedUploads' | 'onUploadFile'
> & {
  actionsDisabled?: boolean;
  parent?: QueuedParent;
  queuedAttachmentsForParent?: QueuedAttachment[];
  scopeKey: string;
  visibleFiles: FileItem[];
  visualMedia: FileItem[];
}) => {
  const [localPreviewUris, setLocalPreviewUris] = React.useState<
    Record<string, string>
  >({});

  const [activeUploadIds, setActiveUploadIds] = React.useState(
    () => new Set<string>()
  );

  const [optimisticUploads, setOptimisticUploads] = React.useState<
    fileComposer.PendingUpload[]
  >([]);

  const [focusedAudioId, setFocusedAudioId] = React.useState<string | null>(
    null
  );

  const unsubmittedQueuedAttachments = outbox.useQueuedAttachments(parent);

  const queuedAttachments =
    queuedAttachmentsForParent ?? unsubmittedQueuedAttachments;

  const parentRef = React.useRef(parent);

  React.useEffect(() => {
    parentRef.current = parent;
  }, [parent]);

  const queuedPendingUploads = React.useMemo(
    (): fileComposer.PendingUpload[] =>
      queuedAttachments.map((attachment) => ({
        height: attachment.height,
        id: attachment.id,
        duration: attachment.duration,
        mimeType: attachment.mimeType,
        name: attachment.name,
        order: attachment.order,
        size: attachment.size,
        status: attachment.status,
        type: attachment.type,
        uri: attachment.localUri,
        width: attachment.width,
      })),
    [queuedAttachments]
  );

  const queuedUploadIds = React.useMemo(
    () => new Set(queuedPendingUploads.map((item) => item.id)),
    [queuedPendingUploads]
  );

  const pendingUploads = React.useMemo(
    () =>
      [
        ...queuedPendingUploads,
        ...optimisticUploads.filter((item) => !queuedUploadIds.has(item.id)),
      ].sort((a, b) => a.order - b.order),
    [optimisticUploads, queuedPendingUploads, queuedUploadIds]
  );

  React.useEffect(() => {
    if (!queuedUploadIds.size) return;

    setOptimisticUploads((current) => {
      const next = current.filter((item) => !queuedUploadIds.has(item.id));
      return next.length === current.length ? current : next;
    });
  }, [queuedUploadIds]);

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
    setLocalPreviewUris({});
    setOptimisticUploads([]);
    setFocusedAudioId(null);
    setActiveUploadIds(new Set());
  }, [scopeKey]);

  const markUploadActive = React.useCallback((fileId: string) => {
    setActiveUploadIds((current) => new Set(current).add(fileId));
  }, []);

  const markUploadInactive = React.useCallback((fileId: string) => {
    setActiveUploadIds((current) => {
      if (!current.has(fileId)) return current;
      const next = new Set(current);
      next.delete(fileId);
      return next;
    });
  }, []);

  const markQueuedAttachmentUploaded = React.useCallback(
    async (attachment: QueuedAttachment, uploadedFile?: FileItem) => {
      let file = uploadedFile;

      if (!file) {
        try {
          file = await existingUpload.getExistingFileForQueuedParent({
            fileId: attachment.id,
            parent: attachment,
          });
        } catch {
          // The file snapshot is best-effort; the outbox can still complete.
        }
      }

      outbox.markQueuedAttachmentUploaded(attachment.id, file);
    },
    []
  );

  const uploadQueuedAttachment = React.useCallback(
    async (
      attachment: QueuedAttachment,
      asset?: pickedFiles.PickedFileAsset
    ) => {
      if (activeUploadIds.has(attachment.id)) return;
      markUploadActive(attachment.id);
      outbox.setQueuedAttachmentStatus(attachment.id, 'uploading');

      try {
        const existingFile =
          await existingUpload.getExistingFileForQueuedParent({
            fileId: attachment.id,
            parent: attachment,
          });

        if (existingFile?.id) {
          await markQueuedAttachmentUploaded(attachment, existingFile);
          return;
        }

        await onUploadFile(
          asset ?? {
            fileName: attachment.name,
            height: attachment.height,
            mimeType: attachment.mimeType,
            size: attachment.size,
            type: attachment.type,
            uri: attachment.localUri,
            width: attachment.width,
          },
          attachment.id,
          attachment.order
        );

        await markQueuedAttachmentUploaded(attachment);
      } catch (error) {
        if (existingUpload.isExistingFileIdError(error)) {
          const existingFile =
            await existingUpload.getExistingFileForQueuedParent({
              fileId: attachment.id,
              parent: attachment,
            });

          if (existingFile?.id) {
            await markQueuedAttachmentUploaded(attachment, existingFile);
            return;
          }
        }

        outbox.setQueuedAttachmentStatus(
          attachment.id,
          'error',
          error instanceof Error ? error.message : 'Failed to upload files.'
        );
      } finally {
        markUploadInactive(attachment.id);
      }
    },
    [
      activeUploadIds,
      markQueuedAttachmentUploaded,
      markUploadActive,
      markUploadInactive,
      onUploadFile,
    ]
  );

  const uploadAssets = React.useCallback(
    (inputAssets: pickedFiles.PickedFileAsset[]) => {
      if (actionsDisabled) return;
      const assets = inputAssets;
      const currentParent = parentRef.current;
      if (!assets.length || !currentParent) return;
      const fileIds = assets.map(() => id());

      const baseOrder = queuedAttachmentUtils.getNextAttachmentOrder({
        files: visibleFiles,
        queuedAttachments,
      });

      let focusedAudioIndex = -1;

      for (let i = assets.length - 1; i >= 0; i -= 1) {
        if (assets[i].type !== 'audio') continue;
        focusedAudioIndex = i;
        break;
      }

      if (focusedAudioIndex >= 0) setFocusedAudioId(fileIds[focusedAudioIndex]);

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

      setOptimisticUploads((current) => [
        ...current.filter((item) => !fileIds.includes(item.id)),
        ...queue.map(
          ({ asset, fileId, order }): fileComposer.PendingUpload => ({
            height: asset.height,
            id: fileId,
            mimeType: asset.mimeType ?? undefined,
            name: asset.fileName ?? undefined,
            order,
            size: asset.size ?? undefined,
            status: 'queued',
            type: asset.type,
            uri: asset.uri,
            width: asset.width,
          })
        ),
      ]);

      const run = async (items: typeof queue) => {
        for (const { asset, fileId, order } of items) {
          try {
            const attachment = await outbox.queuePickedAttachment({
              ...currentParent,
              asset,
              fileId,
              order,
              persistBinary: false,
              status: 'persisting',
            });

            void outbox
              .persistPickedAttachmentBinary(fileId, asset)
              .then(() => {
                if (deferQueuedUploads) return;
                outbox.retryFailedOutboxWork();
                void outboxSyncCore.runOutboxSync();
              })
              .catch(() => {
                if (!deferQueuedUploads) {
                  void uploadQueuedAttachment(attachment, asset);
                  return;
                }

                void outbox.removeQueuedAttachment(fileId);

                setOptimisticUploads((current) =>
                  current.filter((item) => item.id !== fileId)
                );

                removeLocalPreviewUri(fileId);
                clearFocusedAudioId(fileId);
                // noop
              });

            if (attachment.status !== 'persisting' && !deferQueuedUploads) {
              await uploadQueuedAttachment(attachment, asset);
            }
          } catch {
            void outbox.removeQueuedAttachment(fileId);

            setOptimisticUploads((current) =>
              current.filter((item) => item.id !== fileId)
            );

            removeLocalPreviewUri(fileId);
            clearFocusedAudioId(fileId);
            // noop
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
      actionsDisabled,
      deferQueuedUploads,
      queuedAttachments,
      removeLocalPreviewUri,
      uploadQueuedAttachment,
      visibleFiles,
    ]
  );

  React.useEffect(() => {
    const fileIds = new Set(
      visibleFiles
        .filter((item) => !visualMedia.isProcessing(item))
        .map((item) => item.id)
    );

    queuedAttachments.forEach((attachment) => {
      if (attachment.submissionId) return;

      if (fileIds.has(attachment.id)) {
        void outbox.removeQueuedAttachment(attachment.id);
      }
    });
  }, [queuedAttachments, visibleFiles]);

  React.useEffect(() => {
    if (deferQueuedUploads) return;

    queuedAttachments.forEach((attachment) => {
      if (attachment.submissionId) return;
      if (attachment.status !== 'queued') return;
      void uploadQueuedAttachment(attachment);
    });
  }, [deferQueuedUploads, queuedAttachments, uploadQueuedAttachment]);

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
              status: item.status,
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
