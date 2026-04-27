import { Linking } from 'react-native';

export type DownloadFileOptions = {
  blob?: Blob;
  fileName?: string;
  mimeType?: string;
  url?: string;
};

export const downloadFile = async ({ url }: DownloadFileOptions) => {
  if (!url) throw new Error('Missing download URL');
  await Linking.openURL(url);
};
