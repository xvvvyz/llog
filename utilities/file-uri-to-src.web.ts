import {
  buildFileUrl,
  isProtectedUri,
  resolveFileAccessToken,
  useFileAccessToken,
} from '@/utilities/file-access-token';
import { useMemo } from 'react';

export { useFileAccessToken } from '@/utilities/file-access-token';

const blobCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export const fileUriToSrc = (uri: string, token?: string | null) => {
  const url = buildFileUrl(uri, token);
  return blobCache.get(url) ?? url;
};

export const useFileUriToSrc = (uri: string) => {
  const token = useFileAccessToken();
  const tokenForUrl = isProtectedUri(uri) ? token : null;
  return useMemo(() => fileUriToSrc(uri, tokenForUrl), [uri, tokenForUrl]);
};

export const preloadMedia = async (uri: string) => {
  const url = buildFileUrl(uri, await resolveFileAccessToken());

  const cached = blobCache.get(url);
  if (cached) return cached;

  const inflight = pending.get(url);
  if (inflight) return inflight;

  const promise = fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(url, blobUrl);
      pending.delete(url);
      return blobUrl;
    })
    .catch(() => {
      pending.delete(url);
      return url;
    });

  pending.set(url, promise);
  return promise;
};
