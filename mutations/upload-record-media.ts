import { api } from '@/utilities/api';
import { prepareMediaFormData } from '@/utilities/prepare-media-form-data';
import { ImagePickerAsset } from 'expo-image-picker';

export const uploadRecordMedia = async ({
  asset,
  audioUri,
  duration,
  recordId,
}: {
  asset?: ImagePickerAsset;
  audioUri?: string;
  duration?: number;
  recordId?: string;
}) => {
  if (!recordId) return;

  const body = await prepareMediaFormData({ asset, audioUri, duration });
  if (!body) return;

  await api(`/files/records/${recordId}/media`, { body, method: 'PUT' });
};
