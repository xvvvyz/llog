export const fileUriToSrc = (uri: string) =>
  uri.startsWith('https://') || uri.startsWith('data:image/')
    ? uri
    : `${process.env.EXPO_PUBLIC_API_URL}/files/${uri}`;

export const preloadMedia = (_uri: string): Promise<string> =>
  Promise.resolve(fileUriToSrc(_uri));
