import { directVideoUpload } from '@/features/files/lib/direct-video-upload';
import { prepareFileFormData } from '@/features/files/lib/form-data';
import { PickedFileAsset } from '@/features/files/lib/picked';
import { uploadR2MultipartFile } from '@/features/files/lib/r2-multipart-upload';
import { apiOrThrow } from '@/lib/api';
import { apiUpload } from '@/lib/api-upload';
import * as uploadProgressStore from '@/features/files/lib/upload-progress-store';

type UploadFileArgs = {
  asset?: PickedFileAsset;
  audioUri?: string;
  duration?: number;
  fileId?: string;
  order?: number;
  path: string;
};

export const uploadFile = async ({
  asset,
  audioUri,
  duration,
  fileId,
  order,
  path,
}: UploadFileArgs) => {
  if (asset?.type === 'video') {
    try {
      await directVideoUpload({
        asset,
        fileId,
        onProgress: fileId
          ? (fraction) =>
              uploadProgressStore.setUploadProgress(fileId, fraction)
          : undefined,
        order,
        path,
      });
    } finally {
      if (fileId) uploadProgressStore.clearUploadProgress(fileId);
    }

    return;
  }

  if (audioUri || asset?.type === 'audio' || asset?.type === 'document') {
    await uploadR2MultipartFile({
      asset,
      audioUri,
      duration,
      fileId,
      order,
      path,
    });

    return;
  }

  const body = await prepareFileFormData({
    asset,
    audioUri,
    duration,
    fileId,
    order,
  });

  if (!body) return;
  await apiUpload(path, body);
};

export const deleteFile = async ({
  errorMessage,
  path,
}: {
  errorMessage: string;
  path: string;
}) => {
  await apiOrThrow(path, { method: 'DELETE' }, errorMessage);
};
