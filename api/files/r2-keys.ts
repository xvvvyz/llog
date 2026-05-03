export const isR2Key = (uri?: string | null): uri is string =>
  !!uri && (isPublicR2Key(uri) || isPrivateR2Key(uri));

const isPrivateR2Key = (uri: string) =>
  uri.startsWith('records/') || uri.startsWith('replies/');

const isPublicR2Key = (uri: string) =>
  uri.startsWith('profiles/') || uri.startsWith('teams/');

export const getFileScope = (uri: string) => {
  if (isPublicR2Key(uri)) return 'public';
  if (isPrivateR2Key(uri)) return 'private';
  return 'unknown';
};

export const getFileR2Keys = (item: { assetKey?: string | null }) => [
  ...new Set([item.assetKey].filter(isR2Key)),
];
