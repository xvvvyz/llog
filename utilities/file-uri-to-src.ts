import {
  buildFileUrl,
  isProtectedUri,
  resolveFileAccessToken,
  useFileAccessToken,
} from '@/utilities/file-access-token';
import { useMemo } from 'react';

export { useFileAccessToken } from '@/utilities/file-access-token';

export const fileUriToSrc = buildFileUrl;

export const useFileUriToSrc = (uri: string) => {
  const token = useFileAccessToken();
  const tokenForUrl = isProtectedUri(uri) ? token : null;
  return useMemo(() => buildFileUrl(uri, tokenForUrl), [uri, tokenForUrl]);
};

export const preloadMedia = async (uri: string) =>
  buildFileUrl(uri, await resolveFileAccessToken());
