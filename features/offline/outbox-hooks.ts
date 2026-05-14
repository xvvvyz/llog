import type * as pickedFiles from '@/features/files/lib/picked';
import * as outboxStore from '@/features/offline/outbox-store';
import * as outboxStorage from '@/features/offline/storage';
import * as React from 'react';
import type * as types from '@/features/offline/types';

type QueuePickedAttachmentInput = types.QueuedParent & {
  asset: pickedFiles.PickedFileAsset;
  fileId: string;
  order: number;
};

type QueueAudioAttachmentInput = types.QueuedParent & {
  audioUri: string;
  duration?: number;
  fileId: string;
  order: number;
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
  ...parent
}: QueuePickedAttachmentInput) => {
  const saved = await outboxStorage.saveAttachmentBinary(fileId, { asset });

  return outboxStore.queueAttachment({
    ...parent,
    height: asset.height,
    id: fileId,
    localUri: saved.localUri,
    mimeType: saved.mimeType ?? asset.mimeType,
    name: asset.fileName,
    order,
    size: saved.size ?? asset.size,
    type: asset.type,
    width: asset.width,
  });
};

export const queueAudioAttachment = async ({
  audioUri,
  duration,
  fileId,
  order,
  ...parent
}: QueueAudioAttachmentInput) => {
  const saved = await outboxStorage.saveAttachmentBinary(fileId, { audioUri });

  return outboxStore.queueAttachment({
    ...parent,
    duration,
    id: fileId,
    isRecording: true,
    localUri: saved.localUri,
    mimeType: saved.mimeType,
    name: 'recording',
    order,
    size: saved.size,
    type: 'audio',
  });
};

export const removeQueuedAttachment = outboxStore.removeQueuedAttachment;

export const setQueuedAttachmentStatus = outboxStore.setQueuedAttachmentStatus;

export const queueSubmission = (input: types.QueueSubmissionInput) =>
  outboxStore.queueSubmission(input);

export const markQueuedAttachmentUploaded =
  outboxStore.markQueuedAttachmentUploaded;
