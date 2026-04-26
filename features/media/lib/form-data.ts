import { assetToFileLike } from '@/features/media/lib/asset-to-file-like';
import { PickedMediaAsset } from '@/features/media/lib/picked';
import { processImageAsset } from '@/features/media/lib/process-image';
import { Platform } from 'react-native';

export const prepareMediaFormData = async ({
  asset,
  audioUri,
  duration,
  mediaId,
  order,
}: {
  asset?: PickedMediaAsset;
  audioUri?: string;
  duration?: number;
  mediaId?: string;
  order?: number;
}): Promise<FormData | null> => {
  const body = new FormData();

  if (audioUri) {
    if (Platform.OS === 'web') {
      const response = await fetch(audioUri);
      const blob = await response.blob();

      body.append(
        'file',
        new File([blob], 'recording', { type: blob.type || 'audio/webm' })
      );
    } else {
      body.append('file', {
        uri: audioUri,
        type: 'audio/mp4',
        name: 'recording.m4a',
      });
    }

    if (duration != null) body.append('duration', String(duration));
  } else if (asset) {
    if (asset.type === 'image') {
      body.append('file', await processImageAsset(asset));
    } else {
      body.append('file', await assetToFileLike(asset));
    }

    if (asset.fileName?.trim()) body.append('fileName', asset.fileName.trim());
    if (asset.mimeType?.trim()) body.append('mimeType', asset.mimeType.trim());
    if (asset.size != null) body.append('size', String(asset.size));
  } else {
    return null;
  }

  if (mediaId) body.append('mediaId', mediaId);
  if (order != null) body.append('order', String(order));
  return body;
};
