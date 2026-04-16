import { api } from '@/utilities/api';
import { apiUpload } from '@/utilities/api-upload';
import { prepareMediaFormData } from '@/utilities/prepare-media-form-data';
import { ImagePickerAsset } from 'expo-image-picker';

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
  asset?: ImagePickerAsset;
  audioUri?: string;
  replyId?: string;
  duration?: number;
  mediaId?: string;
  onProgress?: (progress: number) => void;
  order?: number;
  recordId?: string;
}) => {
  if (!replyId || !recordId) return;

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
      `/files/records/${recordId}/replies/${replyId}/media`,
      body,
      onProgress
    );
  } else {
    await api(`/files/records/${recordId}/replies/${replyId}/media`, {
      body,
      method: 'PUT',
    });
  }
};
