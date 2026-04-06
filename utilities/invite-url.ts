export const getInviteUrl = (token: string) =>
  `${process.env.EXPO_PUBLIC_APP_URL}/invite/${token}`;
