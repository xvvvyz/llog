import * as React from 'react';
import { Platform } from 'react-native';
import * as cachedMediaSource from '@/features/files/lib/cached-media-source';
import * as fileUriToSrc from '@/features/files/lib/file-uri-to-src';

type CachedSourceType = 'image' | 'media';
type CachedSourceResult = { src: string | null };

type CacheLookupState = {
  canLookupCache: boolean;
  requestedSrc: string | null;
  cachedSrc: string | null;
  isChecked: boolean;
};

export const isLocalFileSourceUri = (uri?: string | null) =>
  !!uri && /^(blob|content|data|file):/i.test(uri);

const getCacheStorage = () =>
  Platform.OS === 'web' && typeof globalThis.caches !== 'undefined'
    ? globalThis.caches
    : null;

const canReadCacheStorage = () => !!getCacheStorage();

const getCachedSourceUrls = async () => {
  const cacheStorage = getCacheStorage();
  if (!cacheStorage) return [];
  const cacheNames = await cacheStorage.keys();

  const requests = await Promise.all(
    cacheNames.map(async (cacheName) => {
      const cache = await cacheStorage.open(cacheName);
      return cache.keys();
    })
  );

  return requests.flat().map((request) => request.url);
};

const findCachedSource = async (
  src: string,
  type: CachedSourceType = 'media'
) => {
  const cacheStorage = getCacheStorage();
  if (!cacheStorage) return null;
  const exact = await cacheStorage.match(src);
  if (type !== 'image') return exact ? src : null;
  const cachedSources = await getCachedSourceUrls();

  return (
    cachedMediaSource.findLargestCachedImageSource(src, cachedSources) ??
    (exact ? src : null)
  );
};

export const useCachedFileSource = ({
  enabled = true,
  options,
  type = 'media',
  uri,
}: {
  enabled?: boolean;
  options?: fileUriToSrc.FileUriToSrcOptions;
  type?: CachedSourceType;
  uri?: string | null;
}): CachedSourceResult => {
  const requestedSrc = fileUriToSrc.fileUriToSrc(uri, options);

  const isLocal =
    isLocalFileSourceUri(uri) || isLocalFileSourceUri(requestedSrc);

  const canLookupCache =
    enabled && !!requestedSrc && !isLocal && canReadCacheStorage();

  const [cacheLookup, setCacheLookup] = React.useState<CacheLookupState>({
    canLookupCache: false,
    requestedSrc: null,
    cachedSrc: null,
    isChecked: false,
  });

  React.useEffect(() => {
    if (!canLookupCache) {
      setCacheLookup((current) => {
        if (
          current.requestedSrc === requestedSrc &&
          current.canLookupCache === false &&
          current.cachedSrc === null &&
          current.isChecked
        ) {
          return current;
        }

        return {
          canLookupCache: false,
          requestedSrc,
          cachedSrc: null,
          isChecked: true,
        };
      });

      return;
    }

    let cancelled = false;

    setCacheLookup({
      canLookupCache: true,
      requestedSrc,
      cachedSrc: null,
      isChecked: false,
    });

    void findCachedSource(requestedSrc, type)
      .then((src) => {
        if (!cancelled) {
          setCacheLookup({
            canLookupCache: true,
            requestedSrc,
            cachedSrc: src,
            isChecked: true,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCacheLookup({
            canLookupCache: true,
            requestedSrc,
            cachedSrc: null,
            isChecked: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canLookupCache, requestedSrc, type]);

  const hasCurrentLookup = cacheLookup.requestedSrc === requestedSrc;
  const cachedSrc = hasCurrentLookup ? cacheLookup.cachedSrc : null;
  return { src: cachedSrc ?? requestedSrc };
};
