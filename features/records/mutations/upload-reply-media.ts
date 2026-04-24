import { PickedMediaAsset } from '@/features/media/lib/picked';
import { uploadMedia } from '@/features/media/mutations/requests';

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
