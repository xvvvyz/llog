import * as fileUriToSrcShared from '@/features/media/lib/file-uri-to-src.shared';

export {
  fileUriToSrc,
  useFileUriToSrc,
  type FileUriToSrcOptions,
  type ResolvedFileUrl,
} from '@/features/media/lib/file-uri-to-src.shared';

export const preloadMedia = async (
  uri: string,
  options?: fileUriToSrcShared.FileUriToSrcOptions
) => {
  const src = fileUriToSrcShared.fileUriToSrc(uri, options);
  if (!src) return;

  await new Promise<void>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
};
