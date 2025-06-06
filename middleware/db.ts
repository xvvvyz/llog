import schema from '@/instant.schema';
import { init } from '@instantdb/admin';
import { createMiddleware } from 'hono/factory';

export interface DbVariables {
  db: ReturnType<typeof init<typeof schema>>;
}

export const db = () =>
  createMiddleware<{
    Bindings: CloudflareBindings;
    Variables: DbVariables;
  }>(async (c, next) => {
    c.set(
      'db',
      init({
        adminToken: c.env.INSTANT_APP_ADMIN_TOKEN,
        appId: c.env.INSTANT_APP_ID,
        schema,
      })
    );

    await next();
  });
