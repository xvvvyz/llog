import { createAdminDb, type Db } from '@/api/middleware/db';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

type AppContext = Context<{ Bindings: CloudflareEnv }>;

export const getFileScope = (key: string) => {
  if (key.startsWith('profiles/') || key.startsWith('teams/')) {
    return 'public';
  }

  if (key.startsWith('records/') || key.startsWith('replies/')) {
    return 'private';
  }

  return 'unknown';
};

const getAuthToken = (c: AppContext) =>
  c.req.query('token') ?? c.req.header('Authorization')?.split(' ')[1] ?? '';

const getMediaByKey = async (dbClient: Db, key: string) => {
  const uriResult = await dbClient.query({
    media: {
      $: { fields: ['id'] as ['id'], where: { uri: key } },
    },
  });

  if (uriResult.media?.[0]?.id) {
    return uriResult.media[0];
  }

  const previewResult = await dbClient.query({
    media: {
      $: { fields: ['id'] as ['id'], where: { previewUri: key } },
    },
  });

  return previewResult.media?.[0];
};

export const requirePrivateFileAccess = async (c: AppContext, key: string) => {
  const token = getAuthToken(c);

  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const adminDb = createAdminDb(c.env);

  try {
    await adminDb.auth.verifyToken(token);
  } catch {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const media = await getMediaByKey(adminDb.asUser({ token }), key);

  if (!media?.id) {
    throw new HTTPException(404, { message: 'File not found' });
  }
};
