import { assetToFileLike } from '@/features/files/lib/asset-to-file-like';
import { PickedFileAsset } from '@/features/files/lib/picked';
import { processImageAsset } from '@/features/files/lib/process-image';
import { Platform } from 'react-native';

export const prepareFileFormData = async ({
  asset,
  audioUri,
  duration,
  fileId,
  order,
}: {
  asset?: PickedFileAsset;
  audioUri?: string;
  duration?: number;
  fileId?: string;
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

  if (fileId) body.append('fileId', fileId);
  if (order != null) body.append('order', String(order));
  return body;
};
