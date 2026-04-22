import { assetToFileLike } from '@/lib/asset-to-file-like';
import { PickedMediaAsset } from '@/lib/picked-media';
import { processImageAsset } from '@/lib/process-image-asset';
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
        new File([blob], 'recording', {
          type: blob.type || 'audio/webm',
        })
      );
    } else {
      body.append('file', {
        uri: audioUri,
        type: 'audio/mp4',
        name: 'recording.m4a',
      });
    }

    if (duration != null) {
      body.append('duration', String(duration));
    }
  } else if (asset) {
    const isAudio = asset.type === 'audio';
    const isVideo = asset.type === 'video';

    if (isAudio || isVideo) {
      body.append('file', await assetToFileLike(asset));
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
