import type * as pickedFiles from '@/features/files/lib/picked';
import * as outboxStore from '@/features/offline/outbox-store';
import * as outboxStorage from '@/features/offline/storage';
import * as React from 'react';
import type * as types from '@/features/offline/types';

type QueuePickedAttachmentInput = types.QueuedParent & {
  asset: pickedFiles.PickedFileAsset;
  fileId: string;
  order: number;
  persistBinary?: boolean;
  status?: types.QueuedAttachmentStatus;
};

type QueueAudioAttachmentInput = types.QueuedParent & {
  audioUri: string;
  duration?: number;
  fileId: string;
  order: number;
  persistBinary?: boolean;
};

export const useOutbox = outboxStore.useOutboxSnapshot;

export const useQueuedAttachments = (parent?: types.QueuedParent) => {
  const outbox = useOutbox();

  return React.useMemo(
    () => outboxStore.getQueuedAttachmentsForParent(outbox, parent),
    [outbox, parent]
  );
};

export const useQueuedDraft = (parent?: {
  parentId: string;
  parentType: 'record' | 'reply';
}) => {
  const outbox = useOutbox();

  return React.useMemo(
    () => outboxStore.getQueuedDraftForParent(outbox, parent),
    [outbox, parent]
  );
};

export const queuePickedAttachment = async ({
  asset,
  fileId,
  order,
  persistBinary = true,
  status,
  ...parent
}: QueuePickedAttachmentInput) => {
  const saved = persistBinary
    ? await outboxStorage.saveAttachmentBinary(fileId, { asset })
    : undefined;

  const queuedStatus: types.QueuedAttachmentStatus | undefined = status;

  return outboxStore.queueAttachment({
    ...parent,
    height: asset.height,
    id: fileId,
    localUri: saved?.localUri ?? asset.uri,
    mimeType: saved?.mimeType ?? asset.mimeType,
    name: asset.fileName,
    order,
    size: saved?.size ?? asset.size,
    ...(queuedStatus ? { status: queuedStatus } : {}),
    type: asset.type,
    width: asset.width,
  });
};

export const persistPickedAttachmentBinary = async (
  fileId: string,
  asset: pickedFiles.PickedFileAsset
) => {
  const saved = await outboxStorage.saveAttachmentBinary(fileId, { asset });

  outboxStore.updateQueuedAttachment(fileId, {
    localUri: saved.localUri,
    mimeType: saved.mimeType ?? asset.mimeType ?? undefined,
    size: saved.size ?? asset.size ?? undefined,
    status: 'queued',
  });
};

export const queueAudioAttachment = async ({
  audioUri,
  duration,
  fileId,
  order,
  persistBinary = true,
  ...parent
}: QueueAudioAttachmentInput) => {
  const saved = persistBinary
    ? await outboxStorage.saveAttachmentBinary(fileId, { audioUri })
    : undefined;

  return outboxStore.queueAttachment({
    ...parent,
    duration,
    id: fileId,
    isRecording: true,
    localUri: saved?.localUri ?? audioUri,
    mimeType: saved?.mimeType,
    name: 'recording',
    order,
    size: saved?.size,
    type: 'audio',
  });
};

export const removeQueuedAttachment = outboxStore.removeQueuedAttachment;

export const updateQueuedAttachment = outboxStore.updateQueuedAttachment;

export const setQueuedAttachmentStatus = outboxStore.setQueuedAttachmentStatus;

export const queueSubmission = (input: types.QueueSubmissionInput) =>
  outboxStore.queueSubmission(input);

export const retryFailedOutboxWork = outboxStore.retryFailedOutboxWork;

export const markQueuedAttachmentUploaded =
  outboxStore.markQueuedAttachmentUploaded;
