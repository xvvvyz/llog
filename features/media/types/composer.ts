import type * as pickedMedia from '@/features/media/lib/picked';
import type { Media } from '@/features/media/types/media';
import type * as React from 'react';

export interface PendingUpload {
  height?: number;
  id: string;
  mimeType?: string;
  name?: string;
  order: number;
  size?: number;
  type: pickedMedia.PickedMediaType;
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
  uri: string;
  width?: number;
}

export interface UseMediaComposerOptions {
  replyId?: string;
  isOpen: boolean;
  extraAttachmentCount?: number;
  extraPreview?: React.ReactNode;
  extraToolbarItems?: React.ReactNode;
  media: Media[];
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onOpenAudio: () => void;
  onUploadMedia: (
    asset: pickedMedia.PickedMediaAsset,
    mediaId: string,
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

export const toVisualMediaType = (
  type?: string | null
): VisualPreviewItem['type'] => (type === 'video' ? 'video' : 'image');
