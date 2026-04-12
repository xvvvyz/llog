import * as fileAccess from '@/utilities/file-access-token';
import * as React from 'react';

export { useFileAccessToken } from '@/utilities/file-access-token';

export const fileUriToSrc = fileAccess.buildFileUrl;

export const useFileUriToSrc = (uri: string) => {
  const token = fileAccess.useFileAccessToken();
  const tokenForUrl = fileAccess.isProtectedUri(uri) ? token : null;
  return React.useMemo(
    () => fileAccess.buildFileUrl(uri, tokenForUrl),
    [uri, tokenForUrl]
  );
};

export const preloadMedia = async (uri: string) =>
  fileAccess.buildFileUrl(uri, await fileAccess.resolveFileAccessToken());
