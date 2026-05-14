import { Share } from 'react-native';

export { getAppUrl } from '@/lib/app-url';

export const shareUrl = async ({
  title,
  url,
}: {
  title?: string;
  url: string;
}) => {
  await Share.share({ message: url, title, url });
};
