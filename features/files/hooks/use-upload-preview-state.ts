import { getFileSourceUri } from '@/features/files/lib/file-uri-to-src';
import * as pickedFiles from '@/features/files/lib/picked';
import * as queuedAttachmentUtils from '@/features/files/lib/queued-attachments';
import * as visualMedia from '@/features/files/lib/visual-media';
import * as fileComposer from '@/features/files/types/composer';
import type { FileItem } from '@/features/files/types/file';
import { useConnectivity } from '@/features/offline/connectivity';
import * as outbox from '@/features/offline/outbox-hooks';
import type { QueuedAttachment, QueuedParent } from '@/features/offline/types';
import { alert } from '@/lib/alert';
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

  const [focusedAudioId, setFocusedAudioId] = React.useState<string | null>(
    null
  );

  const connectivity = useConnectivity();
  const unsubmittedQueuedAttachments = outbox.useQueuedAttachments(parent);

  const queuedAttachments =
    queuedAttachmentsForParent ?? unsubmittedQueuedAttachments;

  const parentRef = React.useRef(parent);

  React.useEffect(() => {
    parentRef.current = parent;
  }, [parent]);

  const pendingUploads = React.useMemo(
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
        } catch (error) {
          console.error('Failed to refresh uploaded file snapshot', error);
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

        if (connectivity.canRunNetworkActions) {
          alert({
            message:
              error instanceof Error
                ? error.message
                : 'Failed to upload files.',
            title: 'Upload queued',
          });
        }
      } finally {
        markUploadInactive(attachment.id);
      }
    },
    [
      activeUploadIds,
      connectivity.canRunNetworkActions,
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

      const run = async (items: typeof queue) => {
        for (const { asset, fileId, order } of items) {
          try {
            const attachment = await outbox.queuePickedAttachment({
              ...currentParent,
              asset,
              fileId,
              order,
              persistBinary:
                !connectivity.canRunNetworkActions || deferQueuedUploads,
            });

            if (connectivity.canRunNetworkActions) {
              await uploadQueuedAttachment(attachment, asset);
            }
          } catch (error) {
            void outbox.removeQueuedAttachment(fileId);
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
      actionsDisabled,
      connectivity.canRunNetworkActions,
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
    if (deferQueuedUploads || !connectivity.canRunNetworkActions) return;

    queuedAttachments.forEach((attachment) => {
      if (attachment.submissionId) return;

      if (attachment.status !== 'queued' && attachment.status !== 'error') {
        return;
      }

      void uploadQueuedAttachment(attachment);
    });
  }, [
    connectivity.canRunNetworkActions,
    deferQueuedUploads,
    queuedAttachments,
    uploadQueuedAttachment,
  ]);

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
