import { PickedMediaAsset } from '@/lib/picked-media';
import { uploadMedia } from '@/mutations/media';

export const uploadReplyMedia = async ({
  asset,
  audioUri,
  replyId,
  duration,
  mediaId,
  order,
  recordId,
}: {
  asset?: PickedMediaAsset;
  audioUri?: string;
  replyId?: string;
  duration?: number;
  mediaId?: string;
  order?: number;
  recordId?: string;
}) => {
  if (!replyId || !recordId) return;

  await uploadMedia({
    asset,
    audioUri,
    duration,
    mediaId,
    order,
    path: `/files/records/${recordId}/replies/${replyId}/media`,
  });
};
