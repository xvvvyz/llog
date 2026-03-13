import { db } from '@/utilities/db';

export const api = async (path: string, options: RequestInit = {}) => {
  const auth = await db.getAuth();
  if (!auth) return;

  const { headers, ...rest } = options;

  return fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${auth.refresh_token}`,
      ...headers,
    },
    ...rest,
  });
};
