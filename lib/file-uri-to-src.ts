import * as fileUriToSrcShared from '@/lib/file-uri-to-src.shared';
import { Image } from 'expo-image';

export {
  fileUriToSrc,
  useFileUriToSrc,
  type FileUriToSrcOptions,
  type ResolvedFileUrl,
} from '@/lib/file-uri-to-src.shared';

export const preloadMedia = async (
  uri: string,
  options?: fileUriToSrcShared.FileUriToSrcOptions
) => {
  const src = fileUriToSrcShared.fileUriToSrc(uri, options);
  if (!src) return;
  await Image.prefetch(src);
};
