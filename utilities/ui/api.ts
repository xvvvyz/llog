import { db } from '@/utilities/ui/db';

export const api = async (path: string, options: RequestInit = {}) => {
  const auth = await db.getAuth();
  if (!auth) return;

  fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${auth.refresh_token}`,
      ...options.headers,
    },
    ...options,
  });
};
