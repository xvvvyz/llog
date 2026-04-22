import { db } from '@/lib/db';

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

export const apiOrThrow = async (
  path: string,
  options: RequestInit = {},
  fallbackMessage = 'Request failed'
) => {
  const response = await api(path, options);
  if (response?.ok) return response;
  if (!response) throw new Error(fallbackMessage);
  let body = '';

  try {
    body = await response.text();
  } catch {
    body = '';
  }

  if (body) {
    try {
      const parsed = JSON.parse(body);

      if (typeof parsed?.message === 'string') {
        throw new Error(parsed.message);
      }

      if (typeof parsed === 'string') {
        throw new Error(parsed);
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error(body);
    }
  }

  throw new Error(`${fallbackMessage} (${response.status})`);
};
