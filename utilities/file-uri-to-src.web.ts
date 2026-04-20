export type ResolvedFileUrl = string | null;

const isAbsoluteUri = (uri: string) => /^[a-z][a-z\d+.-]*:/i.test(uri);

export const fileUriToSrc = (uri?: string | null): ResolvedFileUrl => {
  if (!uri) return null;
  if (isAbsoluteUri(uri)) return uri;
  return `${process.env.EXPO_PUBLIC_API_URL}/files/${uri}`;
};

export const useFileUriToSrc = (uri?: string | null) => fileUriToSrc(uri);

export const preloadMedia = async (uri: string) => {
  const src = fileUriToSrc(uri);
  if (!src) return;

  await new Promise<void>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
};
