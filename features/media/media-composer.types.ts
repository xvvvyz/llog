import type { PickedMediaAsset, PickedMediaType } from '@/lib/picked-media';
import type { Media } from '@/types/media';

export interface PendingUpload {
  fileName?: string;
  height?: number;
  id: string;
  order: number;
  type: PickedMediaType;
  uri: string;
  width?: number;
}

export type PendingAudioUpload = PendingUpload & { type: 'audio' };

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
  media: Media[];
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onOpenAudio: () => void;
  onUploadMedia: (
    asset: PickedMediaAsset,
    mediaId: string,
    order: number
  ) => Promise<void>;
  recordId?: string;
}

export const MAX_AUDIO_ATTACHMENTS = 3;

export const isPendingAudioUpload = (
  item: PendingUpload
): item is PendingAudioUpload => item.type === 'audio';

export const isVisualPendingUpload = (
  item: PendingUpload
): item is PendingUpload & { type: 'image' | 'video' } =>
  item.type === 'image' || item.type === 'video';

export const toVisualMediaType = (
  type?: string | null
): VisualPreviewItem['type'] => (type === 'video' ? 'video' : 'image');
