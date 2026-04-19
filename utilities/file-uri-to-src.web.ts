import * as fileAccess from '@/utilities/file-access-token';
import * as React from 'react';

export { useFileAccessToken } from '@/utilities/file-access-token';

const blobCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export const fileUriToSrc = (uri: string, token?: string | null) => {
  const url = fileAccess.buildFileUrl(uri, token);
  return blobCache.get(url) ?? url;
};

export const useFileUriToSrc = (uri: string) => {
  const token = fileAccess.useFileAccessToken();
  const tokenForUrl = fileAccess.isProtectedUri(uri) ? token : null;
  return React.useMemo(
    () => fileUriToSrc(uri, tokenForUrl),
    [uri, tokenForUrl]
  );
};

export const preloadMedia = async (uri: string) => {
  const url = fileAccess.buildFileUrl(
    uri,
    await fileAccess.resolveFileAccessToken()
  );

  const cached = blobCache.get(url);
  if (cached) return cached;

  const inflight = pending.get(url);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(url, blobUrl);
      pending.delete(url);
      return blobUrl;
    } catch {
      pending.delete(url);
      return url;
    }
  })();

  pending.set(url, promise);
  return promise;
};
