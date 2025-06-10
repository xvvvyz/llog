import { agentsMiddleware } from 'hono-agents';
import { createMiddleware } from 'hono/factory';

export const agents = () =>
  createMiddleware((c, next) =>
    agentsMiddleware({ options: { prefix: 'api/v1/agents' } })(c, next)
  );
