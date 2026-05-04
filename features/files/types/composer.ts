import type * as pickedFiles from '@/features/files/lib/picked';
import type { FileItem } from '@/features/files/types/file';
import type * as React from 'react';

export interface PendingUpload {
  height?: number;
  id: string;
  mimeType?: string;
  name?: string;
  order: number;
  size?: number;
  type: pickedFiles.PickedFileType;
  uri: string;
  width?: number;
}

export type PendingAudioUpload = PendingUpload & { type: 'audio' };

export type PendingDocumentUpload = PendingUpload & { type: 'document' };

export interface VisualPreviewItem {
  height?: number;
  id: string;
  localUri?: string;
  order?: number;
  pending: boolean;
  thumbnailUri?: string | null;
  type: 'image' | 'video';
  uri?: string | null;
  width?: number;
}

export interface UseFileComposerOptions {
  replyId?: string;
  isOpen: boolean;
  extraAttachmentCount?: number;
  extraPreview?: React.ReactNode;
  extraToolbarItems?: React.ReactNode;
  files: FileItem[];
  onDeleteFile: (fileId: string) => Promise<void>;
  onOpenAudio: () => void;
  onRenameFile?: (fileId: string, name: string) => Promise<void>;
  onReorderFiles?: (files: { id: string }[]) => void;
  onUploadFile: (
    asset: pickedFiles.PickedFileAsset,
    fileId: string,
    order: number
  ) => Promise<void>;
  recordId?: string;
}

export const isPendingAudioUpload = (
  item: PendingUpload
): item is PendingAudioUpload => item.type === 'audio';

export const isPendingDocumentUpload = (
  item: PendingUpload
): item is PendingDocumentUpload => item.type === 'document';

export const isVisualPendingUpload = (
  item: PendingUpload
): item is PendingUpload & { type: 'image' | 'video' } =>
  item.type === 'image' || item.type === 'video';

export const toVisualFileType = (
  type?: string | null
): VisualPreviewItem['type'] => (type === 'video' ? 'video' : 'image');
