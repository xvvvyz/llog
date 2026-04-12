import schema from '@/instant.schema';
import { init, User } from '@instantdb/admin';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

export type Db = ReturnType<typeof init<typeof schema>>;

export const createAdminDb = (env: CloudflareEnv) =>
  init({
    adminToken: env.INSTANT_APP_ADMIN_TOKEN,
    appId: env.INSTANT_APP_ID,
    schema,
  });

const getBearerToken = (authorization?: string | null) => {
  if (!authorization) return '';
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme === 'Bearer' && token ? token : '';
};

const verifyUserOrThrow = async (db: Db, authorization?: string | null) => {
  const authToken = getBearerToken(authorization);

  if (!authToken) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  try {
    const user = await db.auth.verifyToken(authToken);
    return { authToken, user };
  } catch {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
};

interface DbMiddlewareOptions {
  asUser?: boolean;
}

interface DbMiddleware<T extends DbMiddlewareOptions> {
  Bindings: CloudflareEnv;
  Variables: {
    db: Db;
    user: T['asUser'] extends true ? User : User | undefined;
  };
}

interface AuthMiddleware {
  Bindings: CloudflareEnv;
  Variables: {
    authToken: string;
    db: Db;
    user: User;
  };
}

export const db = <T extends DbMiddlewareOptions>({ asUser }: T = {} as T) =>
  createMiddleware<DbMiddleware<T>>(async (c, next) => {
    const db = createAdminDb(c.env);

    if (asUser) {
      const { authToken, user } = await verifyUserOrThrow(
        db,
        c.req.header('Authorization')
      );

      c.set('db', db.asUser({ token: authToken }));
      c.set('user', user as DbMiddleware<T>['Variables']['user']);
    } else {
      c.set('db', db);
      c.set('user', undefined as DbMiddleware<T>['Variables']['user']);
    }

    await next();
  });

export const auth = () =>
  createMiddleware<AuthMiddleware>(async (c, next) => {
    const { authToken, user } = await verifyUserOrThrow(
      c.var.db,
      c.req.header('Authorization')
    );

    c.set('authToken', authToken);
    c.set('user', user);
    await next();
  });
