import { api } from '@/utilities/api';
import { prepareMediaFormData } from '@/utilities/prepare-media-form-data';
import { ImagePickerAsset } from 'expo-image-picker';

export const uploadCommentMedia = async ({
  asset,
  audioUri,
  commentId,
  duration,
  recordId,
}: {
  asset?: ImagePickerAsset;
  audioUri?: string;
  commentId?: string;
  duration?: number;
  recordId?: string;
}) => {
  if (!commentId || !recordId) return;

  const body = await prepareMediaFormData({ asset, audioUri, duration });
  if (!body) return;

  await api(`/files/records/${recordId}/comments/${commentId}/media`, {
    body,
    method: 'PUT',
  });
};
