import type { DownloadFileOptions } from '@/features/media/types/download-file';
import { Linking } from 'react-native';

export const downloadFile = async ({ url }: DownloadFileOptions) => {
  if (!url) throw new Error('Missing download URL');
  await Linking.openURL(url);
};
