const INVITE_PATH_SEGMENT = 'join';
const trimTrailingSlashes = (value: string) => value.trim().replace(/\/+$/, '');

export const getInviteUrl = (
  token: string,
  appUrl = process.env.EXPO_PUBLIC_APP_URL
) => {
  if (!token) throw new Error('Invite token is required to build invite URLs');
  if (!appUrl) throw new Error('EXPO_PUBLIC_APP_URL is required for invites');
  const normalizedAppUrl = trimTrailingSlashes(appUrl);

  if (!normalizedAppUrl) {
    throw new Error('EXPO_PUBLIC_APP_URL is required for invites');
  }

  const encodedToken = encodeURIComponent(token);
  return `${normalizedAppUrl}/${INVITE_PATH_SEGMENT}/${encodedToken}`;
};
