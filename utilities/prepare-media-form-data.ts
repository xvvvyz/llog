import { processImageAsset } from '@/utilities/process-image-asset';
import { ImagePickerAsset } from 'expo-image-picker';

export const prepareMediaFormData = async ({
  asset,
  audioUri,
  duration,
}: {
  asset?: ImagePickerAsset;
  audioUri?: string;
  duration?: number;
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
    body.append('file', await processImageAsset(asset));
  } else {
    return null;
  }

  return body;
};
