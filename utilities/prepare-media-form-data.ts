import { assetToFileLike } from '@/utilities/asset-to-file-like';
import { normalizeAudioForUpload } from '@/utilities/normalize-audio-for-upload';
import { processImageAsset } from '@/utilities/process-image-asset';
import { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

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
    if (Platform.OS === 'web') {
      const response = await fetch(audioUri);
      const blob = await response.blob();
      body.append('file', await normalizeAudioForUpload(blob));
    } else {
      body.append('file', {
        uri: audioUri,
        type: 'audio/mp4',
        name: 'recording.m4a',
      } as unknown as File);
    }

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
