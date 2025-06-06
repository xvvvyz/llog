import { DbVariables } from '@/middleware/db';
import { User } from '@instantdb/admin';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

export interface AuthVariables extends DbVariables {
  user: User;
}

export const auth = () =>
  createMiddleware<{
    Bindings: CloudflareBindings;
    Variables: AuthVariables;
  }>(async (c, next) => {
    const token = c.req.header('Authorization')?.split(' ')[1];
    if (!token) throw new HTTPException(401, { message: 'Unauthorized' });
    const user = await c.var.db.auth.verifyToken(token);
    if (!user) throw new HTTPException(401, { message: 'Unauthorized' });
    c.set('user', user);
    await next();
  });
