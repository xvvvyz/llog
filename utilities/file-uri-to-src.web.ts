const blobCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

const toUrl = (uri: string) =>
  uri.startsWith('https://') || uri.startsWith('data:image/')
    ? uri
    : `${process.env.EXPO_PUBLIC_API_URL}/files/${uri}`;

export const fileUriToSrc = (uri: string) => {
  const url = toUrl(uri);
  return blobCache.get(url) ?? url;
};

export const preloadMedia = (uri: string): Promise<string> => {
  const url = toUrl(uri);

  const cached = blobCache.get(url);
  if (cached) return Promise.resolve(cached);

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
