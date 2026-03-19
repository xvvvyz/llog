import { assetToFileLike } from '@/utilities/asset-to-file-like';
import { processImageAsset } from '@/utilities/process-image-asset';
import { ImagePickerAsset } from 'expo-image-picker';

export const prepareMediaFormData = async ({
  asset,
  audioUri,
  duration,
  mediaId,
  order,
}: {
  asset?: ImagePickerAsset;
  audioUri?: string;
  duration?: number;
  mediaId?: string;
  order?: number;
}): Promise<FormData | null> => {
  const body = new FormData();

  if (audioUri) {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    const mimeType = blob.type || 'audio/mp4';
    const ext = mimeType.includes('webm') ? '.webm' : '.m4a';

    body.append(
      'file',
      new File([blob], `recording${ext}`, { type: mimeType })
    );

    if (duration != null) {
      body.append('duration', String(duration));
    }
  } else if (asset) {
    const isVideo = asset.type === 'video';

    if (isVideo) {
      body.append('file', await assetToFileLike(asset));

      if (asset.duration != null) {
        body.append('duration', String(Math.round(asset.duration / 1000)));
      }
    } else {
      body.append('file', await processImageAsset(asset));
    }
  } else {
    return null;
  }

  if (mediaId) body.append('mediaId', mediaId);
  if (order != null) body.append('order', String(order));

  return body;
};
