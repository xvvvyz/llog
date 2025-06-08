import { createMiddleware } from 'hono/factory';
import { secureHeaders } from 'hono/secure-headers';

export const headers = () =>
  createMiddleware<{ Bindings: CloudflareEnv }>((c, next) =>
    c.env.ENV === 'production'
      ? secureHeaders({
          strictTransportSecurity: 'max-age=31536000; includeSubDomains',
          xDnsPrefetchControl: undefined,
          xFrameOptions: 'DENY',
          xXssProtection: undefined,
        })(c, next)
      : next()
  );
