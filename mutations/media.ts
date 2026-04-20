import { api, apiOrThrow } from '@/utilities/api';
import { apiUpload } from '@/utilities/api-upload';
import { directVideoUpload } from '@/utilities/direct-video-upload';
import { PickedMediaAsset } from '@/utilities/picked-media';
import { prepareMediaFormData } from '@/utilities/prepare-media-form-data';

type UploadMediaArgs = {
  asset?: PickedMediaAsset;
  audioUri?: string;
  duration?: number;
  mediaId?: string;
  onProgress?: (progress: number) => void;
  order?: number;
  path: string;
};

export const uploadMedia = async ({
  asset,
  audioUri,
  duration,
  mediaId,
  onProgress,
  order,
  path,
}: UploadMediaArgs) => {
  if (asset?.type === 'video') {
    await directVideoUpload({
      asset,
      mediaId,
      onProgress,
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

  if (onProgress) {
    await apiUpload(path, body, onProgress);
  } else {
    await api(path, { body, method: 'PUT' });
  }
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
