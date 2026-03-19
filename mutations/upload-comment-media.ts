import { api } from '@/utilities/api';
import { apiUpload } from '@/utilities/api-upload';
import { prepareMediaFormData } from '@/utilities/prepare-media-form-data';
import { ImagePickerAsset } from 'expo-image-picker';

export const uploadCommentMedia = async ({
  asset,
  audioUri,
  commentId,
  duration,
  mediaId,
  onProgress,
  order,
  recordId,
}: {
  asset?: ImagePickerAsset;
  audioUri?: string;
  commentId?: string;
  duration?: number;
  mediaId?: string;
  onProgress?: (progress: number) => void;
  order?: number;
  recordId?: string;
}) => {
  if (!commentId || !recordId) return;

  const body = await prepareMediaFormData({
    asset,
    audioUri,
    duration,
    mediaId,
    order,
  });
  if (!body) return;

  if (onProgress) {
    await apiUpload(
      `/files/records/${recordId}/comments/${commentId}/media`,
      body,
      onProgress
    );
  } else {
    await api(`/files/records/${recordId}/comments/${commentId}/media`, {
      body,
      method: 'PUT',
    });
  }
};
