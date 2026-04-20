import { PickedMediaAsset } from '@/utilities/picked-media';
import { uploadMedia } from './media';

export const uploadRecordMedia = async ({
  asset,
  audioUri,
  duration,
  mediaId,
  order,
  recordId,
}: {
  asset?: PickedMediaAsset;
  audioUri?: string;
  duration?: number;
  mediaId?: string;
  order?: number;
  recordId?: string;
}) => {
  if (!recordId) return;

  await uploadMedia({
    asset,
    audioUri,
    duration,
    mediaId,
    order,
    path: `/files/records/${recordId}/media`,
  });
};
