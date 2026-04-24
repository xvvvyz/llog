export const isR2Key = (uri?: string | null): uri is string =>
  !!uri && (isPublicR2Key(uri) || isPrivateR2Key(uri));

export const isPrivateR2Key = (uri: string) =>
  uri.startsWith('records/') || uri.startsWith('replies/');

export const isPublicR2Key = (uri: string) =>
  uri.startsWith('profiles/') || uri.startsWith('teams/');

export const getFileScope = (uri: string) => {
  if (isPublicR2Key(uri)) return 'public';
  if (isPrivateR2Key(uri)) return 'private';
  return 'unknown';
};

export const getMediaR2Keys = (item: { assetKey?: string | null }) => [
  ...new Set([item.assetKey].filter(isR2Key)),
];
