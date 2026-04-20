import { PickedMediaAsset } from '@/utilities/picked-media';
import { uploadMedia } from './media';

export const uploadReplyMedia = async ({
  asset,
  audioUri,
  replyId,
  duration,
  mediaId,
  onProgress,
  order,
  recordId,
}: {
  asset?: PickedMediaAsset;
  audioUri?: string;
  replyId?: string;
  duration?: number;
  mediaId?: string;
  onProgress?: (progress: number) => void;
  order?: number;
  recordId?: string;
}) => {
  if (!replyId || !recordId) return;

  await uploadMedia({
    asset,
    audioUri,
    duration,
    mediaId,
    onProgress,
    order,
    path: `/files/records/${recordId}/replies/${replyId}/media`,
  });
};
