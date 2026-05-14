const trimTrailingSlashes = (value: string) => value.trim().replace(/\/+$/, '');

export const getAppUrl = (
  path: string,
  appUrl = process.env.EXPO_PUBLIC_APP_URL
) => {
  if (!appUrl) return undefined;
  const normalizedAppUrl = trimTrailingSlashes(appUrl);
  if (!normalizedAppUrl) return undefined;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedAppUrl}${normalizedPath}`;
};
