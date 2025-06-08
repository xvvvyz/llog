import schema from '@/instant.schema';
import { init, User } from '@instantdb/admin';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

interface DbMiddlewareOptions {
  asUser?: boolean;
}

interface DbMiddleware<T extends DbMiddlewareOptions> {
  Bindings: CloudflareEnv;
  Variables: {
    db: ReturnType<typeof init<typeof schema>>;
    user: T['asUser'] extends true ? User : undefined;
  };
}

export const db = <T extends DbMiddlewareOptions>({ asUser }: T = {} as T) =>
  createMiddleware<DbMiddleware<T>>(async (c, next) => {
    const db = init({
      adminToken: c.env.INSTANT_APP_ADMIN_TOKEN,
      appId: c.env.INSTANT_APP_ID,
      schema,
    });

    if (asUser) {
      const token = c.req.header('Authorization')?.split(' ')[1];
      if (!token) throw new HTTPException(401, { message: 'Unauthorized' });
      const user = await db.auth.verifyToken(token);
      if (!user) throw new HTTPException(401, { message: 'Unauthorized' });
      c.set('db', db.asUser({ token }));
      c.set('user', user as DbMiddleware<T>['Variables']['user']);
    } else {
      c.set('db', db);
      c.set('user', undefined as DbMiddleware<T>['Variables']['user']);
    }

    await next();
  });
