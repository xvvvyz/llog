import { createMiddleware } from 'hono/factory';
import { secureHeaders } from 'hono/secure-headers';

export const headers = () =>
  createMiddleware<{ Bindings: CloudflareEnv }>((c, next) =>
    c.env.ENV === 'production' ? secureHeaders()(c, next) : next()
  );
