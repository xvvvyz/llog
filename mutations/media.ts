import { apiOrThrow } from '@/lib/api';
import { apiUpload } from '@/lib/api-upload';
import { directVideoUpload } from '@/lib/direct-video-upload';
import { PickedMediaAsset } from '@/lib/picked-media';
import { prepareMediaFormData } from '@/lib/prepare-media-form-data';

type UploadMediaArgs = {
  asset?: PickedMediaAsset;
  audioUri?: string;
  duration?: number;
  mediaId?: string;
  order?: number;
  path: string;
};

export const uploadMedia = async ({
  asset,
  audioUri,
  duration,
  mediaId,
  order,
  path,
}: UploadMediaArgs) => {
  if (asset?.type === 'video') {
    await directVideoUpload({
      asset,
      mediaId,
      order,
      path,
    });

    return;
  }

  const body = await prepareMediaFormData({
    asset,
    audioUri,
    duration,
    mediaId,
    order,
  });

  if (!body) return;
  await apiUpload(path, body);
};

export const deleteMedia = async ({
  errorMessage,
  path,
}: {
  errorMessage: string;
  path: string;
}) => {
  await apiOrThrow(path, { method: 'DELETE' }, errorMessage);
};
